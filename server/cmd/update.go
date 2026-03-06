package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type githubRelease struct {
	TagName string        `json:"tag_name"`
	Assets  []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

const repoAPI = "https://api.github.com/repos/copialot/cronhub/releases/latest"

// FetchLatestVersion 从 GitHub API 获取最新版本信息
func FetchLatestVersion() (*githubRelease, error) {
	resp, err := http.Get(repoAPI)
	if err != nil {
		return nil, fmt.Errorf("请求 GitHub API 失败: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API 返回状态码: %d", resp.StatusCode)
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("解析 GitHub API 响应失败: %w", err)
	}
	return &release, nil
}

// RunUpdate 执行自更新
func RunUpdate(currentVersion string) {
	fmt.Printf("CronHub 当前版本: %s\n", currentVersion)
	fmt.Println("检查最新版本...")

	release, err := FetchLatestVersion()
	if err != nil {
		fmt.Fprintf(os.Stderr, "检查更新失败: %v\n", err)
		os.Exit(1)
	}

	latestVersion := release.TagName
	if latestVersion == currentVersion {
		fmt.Println("已经是最新版本")
		return
	}

	fmt.Printf("发现新版本: %s\n", latestVersion)

	// 确定下载文件名
	goos := runtime.GOOS
	arch := runtime.GOARCH
	assetName := fmt.Sprintf("cronhub-%s-%s.tar.gz", goos, arch)

	// 查找对应的 asset
	var downloadURL string
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}
	if downloadURL == "" {
		fmt.Fprintf(os.Stderr, "找不到当前平台 (%s/%s) 的下载包\n", goos, arch)
		os.Exit(1)
	}

	fmt.Printf("下载 %s ...\n", assetName)

	// 下载到临时目录
	tmpDir, err := os.MkdirTemp("", "cronhub-update-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "创建临时目录失败: %v\n", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	tarPath := tmpDir + "/" + assetName
	resp, err := http.Get(downloadURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "下载失败: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	out, err := os.Create(tarPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "创建临时文件失败: %v\n", err)
		os.Exit(1)
	}
	if _, err := io.Copy(out, resp.Body); err != nil {
		out.Close()
		fmt.Fprintf(os.Stderr, "写入失败: %v\n", err)
		os.Exit(1)
	}
	out.Close()

	// 解压
	fmt.Println("解压...")
	extractCmd := exec.Command("tar", "xzf", tarPath, "-C", tmpDir)
	if err := extractCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "解压失败: %v\n", err)
		os.Exit(1)
	}

	// 获取当前可执行文件路径
	selfPath, err := os.Executable()
	if err != nil {
		fmt.Fprintf(os.Stderr, "获取当前程序路径失败: %v\n", err)
		os.Exit(1)
	}
	// 解析 symlink
	realPath, err := evalSymlinks(selfPath)
	if err != nil {
		realPath = selfPath
	}

	newBinary := tmpDir + "/cronhub"
	if _, err := os.Stat(newBinary); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "解压后找不到 cronhub 二进制文件\n")
		os.Exit(1)
	}

	// 替换自身
	fmt.Println("更新二进制文件...")
	if err := replaceBinary(realPath, newBinary); err != nil {
		fmt.Fprintf(os.Stderr, "替换失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("更新成功！%s -> %s\n", currentVersion, latestVersion)
	fmt.Println("请重启 CronHub 服务以使更新生效")

	// 尝试重启服务
	restartService()
}

func evalSymlinks(path string) (string, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return "", err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return os.Readlink(path)
	}
	return path, nil
}

func replaceBinary(dst, src string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	// 先写到临时文件再 rename，保证原子性
	tmpPath := dst + ".new"
	dstFile, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0755)
	if err != nil {
		return err
	}
	if _, err := io.Copy(dstFile, srcFile); err != nil {
		dstFile.Close()
		os.Remove(tmpPath)
		return err
	}
	dstFile.Close()

	return os.Rename(tmpPath, dst)
}

func restartService() {
	goos := runtime.GOOS
	if goos == "linux" {
		cmd := exec.Command("systemctl", "restart", "cronhub")
		if err := cmd.Run(); err == nil {
			fmt.Println("服务已重启")
			return
		}
	} else if goos == "darwin" {
		home, _ := os.UserHomeDir()
		plistPath := home + "/Library/LaunchAgents/com.cronhub.plist"
		if _, err := os.Stat(plistPath); err == nil {
			unload := exec.Command("launchctl", "unload", plistPath)
			_ = unload.Run()
			load := exec.Command("launchctl", "load", plistPath)
			if err := load.Run(); err == nil {
				fmt.Println("服务已重启")
				return
			}
		}
	}
}

// VersionInfo 版本信息
type VersionInfo struct {
	Current string `json:"current"`
	Latest  string `json:"latest"`
	HasNew  bool   `json:"has_new"`
}

// CheckVersion 检查版本并返回信息（带简单内存缓存，1 小时）
var cachedVersionInfo *VersionInfo
var cacheTime time.Time

func CheckVersion(currentVersion string) *VersionInfo {
	// 缓存 1 小时
	if cachedVersionInfo != nil && time.Since(cacheTime) < time.Hour {
		return cachedVersionInfo
	}

	info := &VersionInfo{
		Current: currentVersion,
		Latest:  currentVersion,
		HasNew:  false,
	}

	release, err := FetchLatestVersion()
	if err == nil && release.TagName != "" {
		info.Latest = release.TagName
		info.HasNew = release.TagName != currentVersion &&
			!strings.HasPrefix(currentVersion, "dev")
	}

	cachedVersionInfo = info
	cacheTime = time.Now()
	return info
}
