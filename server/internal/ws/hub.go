package ws

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn   *websocket.Conn
	send   chan []byte
	roomID string
}

type Hub struct {
	mu      sync.RWMutex
	rooms   map[string]map[*Client]bool
	closeCh chan struct{}
}

func NewHub() *Hub {
	return &Hub{
		rooms:   make(map[string]map[*Client]bool),
		closeCh: make(chan struct{}),
	}
}

func (h *Hub) Register(roomID string, conn *websocket.Conn) *Client {
	client := &Client{
		conn:   conn,
		send:   make(chan []byte, 256),
		roomID: roomID,
	}

	h.mu.Lock()
	if h.rooms[roomID] == nil {
		h.rooms[roomID] = make(map[*Client]bool)
	}
	h.rooms[roomID][client] = true
	h.mu.Unlock()

	go client.writePump()

	log.Printf("WebSocket 客户端加入房间: %s", roomID)
	return client
}

func (h *Hub) Unregister(client *Client) {
	h.mu.Lock()
	if room, ok := h.rooms[client.roomID]; ok {
		if _, exists := room[client]; exists {
			delete(room, client)
			close(client.send)
			if len(room) == 0 {
				delete(h.rooms, client.roomID)
			}
		}
	}
	h.mu.Unlock()
	client.conn.Close()
	log.Printf("WebSocket 客户端离开房间: %s", client.roomID)
}

// Broadcast 向房间内所有客户端广播消息
func (h *Hub) Broadcast(roomID string, message []byte) {
	h.mu.RLock()
	room, ok := h.rooms[roomID]
	h.mu.RUnlock()

	if !ok {
		return
	}

	h.mu.RLock()
	for client := range room {
		select {
		case client.send <- message:
		default:
			// 缓冲满，断开连接
			go h.Unregister(client)
		}
	}
	h.mu.RUnlock()
}

// RoomExists 检查房间是否有客户端
func (h *Hub) RoomExists(roomID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	room, ok := h.rooms[roomID]
	return ok && len(room) > 0
}

func (c *Client) writePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}

func (c *Client) ReadPump(hub *Hub) {
	defer hub.Unregister(c)
	for {
		// 只需要读取以检测断开连接
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}
