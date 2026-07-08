package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

// ═══════════════════════════════════════
// 🚀 ELECTRONICS ERP - LAUNCHER .EXE
// ═══════════════════════════════════════
// Features:
// - LICENSE CHECK on startup (asks for key if not activated)
// - Browser auto-open on start
// - Network discovery for mobile users
// - Console visible until user closes it
// ═══════════════════════════════════════

const (
	APP_NAME     = "Electronics ERP"
	APP_VERSION  = "1.0.0"
	DEFAULT_PORT = "8080"
	CONFIG_FILE  = "server-config.json"

	// Master License Key - same as backend
	MASTER_LICENSE_KEY = "Huziafaish1133@#$%"
)

// ServerConfig holds the launcher configuration
type ServerConfig struct {
	Port       string `json:"port"`
	AutoStart  bool   `json:"autoStart"`
	Minimize   bool   `json:"minimize"`
	BackupDir  string `json:"backupDir"`
	AutoBackup bool   `json:"autoBackup"`
	BackupTime string `json:"backupTime"`
	FirstRun   bool   `json:"firstRun"`
}

func main() {
	// ═══════════════════════════════════════
	// STEP 1: Show welcome screen
	// ═══════════════════════════════════════
	showWelcome()

	// ═══════════════════════════════════════
	// STEP 1b: Add Windows Firewall rule for port 8080
	// ═══════════════════════════════════════
	addFirewallRule()

	// ═══════════════════════════════════════
	// STEP 2: Load config
	// ═══════════════════════════════════════
	config := loadConfig()

	// ═══════════════════════════════════════
	// STEP 3: Start the backend server FIRST
	// ═══════════════════════════════════════
	backendPath := findBackend()
	if backendPath == "" {
		logError("backend.exe not found!")
		fmt.Println("\n❌ ERROR: backend.exe not found!")
		fmt.Println("   Make sure backend.exe is in the same folder as this launcher.")
		fmt.Println("\n   Press Enter to exit...")
		bufio.NewReader(os.Stdin).ReadString('\n')
		os.Exit(1)
	}

	fmt.Printf("   Starting backend server from: %s\n", backendPath)
	fmt.Println()

	// Start backend process (hidden)
	cmd := exec.Command(backendPath)
	cmd.Env = os.Environ()
	cmd.Env = append(cmd.Env, "SERVER_PORT="+config.Port)

	// Hide the backend window
	if runtime.GOOS == "windows" {
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	}

	err := cmd.Start()
	if err != nil {
		logError("Failed to start server: " + err.Error())
		fmt.Printf("\n❌ Failed to start server: %v\n", err)
		fmt.Println("\n   Press Enter to exit...")
		bufio.NewReader(os.Stdin).ReadString('\n')
		os.Exit(1)
	}

	// ═══════════════════════════════════════
	// STEP 4: Wait for server to be ready
	// ═══════════════════════════════════════
	fmt.Print("   ⏳ Waiting for server to start...")
	serverReady := waitForServer(config.Port)
	if serverReady {
		fmt.Println(" ✅")
	} else {
		fmt.Println(" ⚠️")
		fmt.Println("   ⚠️ Server may not be ready yet, but continuing...")
	}
	fmt.Println()

	// ═══════════════════════════════════════
	// STEP 5: CHECK LICENSE
	// ═══════════════════════════════════════
	if !checkLicense(config.Port) {
		// License not activated - show activation screen
		showLicenseActivation(config.Port)
	}

	// ═══════════════════════════════════════
	// STEP 6: Get local IP and show connection info
	// ═══════════════════════════════════════
	localIP := getLocalIP()

	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("✅ SERVER IS RUNNING!")
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println()
	fmt.Printf("   📺 LOCAL (This PC):  http://localhost:%s\n", config.Port)
	fmt.Println()
	if localIP != "" {
		fmt.Printf("   📱 MOBILE (Same WiFi): http://%s:%s\n", localIP, config.Port)
		fmt.Println()
		fmt.Println(strings.Repeat("─", 55))
		fmt.Println("   📱 MOBILE WALAY KO YE URL DENA HAI:")
		fmt.Printf("   ➜  http://%s:%s\n", localIP, config.Port)
		fmt.Println(strings.Repeat("─", 55))
		fmt.Println()
		fmt.Println("   ⚠️  IMPORTANT:")
		fmt.Println("   • Mobile apke same WiFi pe hona chahiye")
		fmt.Println("   • Mobile pe browser khol kar ye URL dalna hai")
		fmt.Println("   • PWA install ke liye browser 'Install App' ka option dega")
		fmt.Println()
	} else {
		fmt.Println("   ⚠️  Could not detect network IP")
		fmt.Println("   📱 Mobile access: apna WiFi IP check karein")
		fmt.Println("   CMD mein 'ipconfig' likh kar Enter dabaen")
		fmt.Println()
	}
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("   ✅ Browser auto-opening...")
	fmt.Println()

	fmt.Println("   ⏳ Console ko mat band karein!")
	fmt.Println("   ❌ Band karne ke liye Ctrl+C dabaen ya ye window close karein")
	fmt.Println(strings.Repeat("═", 55))

	// ═══════════════════════════════════════
	// STEP 7: Open browser automatically (HTTP - no SSL)
	// ═══════════════════════════════════════
	openBrowser(fmt.Sprintf("http://localhost:%s", config.Port))

	// ═══════════════════════════════════════
	// STEP 8: Show system tray notification
	// ═══════════════════════════════════════
	showNotification(fmt.Sprintf("Server started on port %s", config.Port))

	// ═══════════════════════════════════════
	// STEP 9: Wait for shutdown signal
	// ═══════════════════════════════════════
	// Yeh console ko khula rakhta hai jab tak user manually close na kare
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println()
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("🛑 Shutting down server...")
	fmt.Println(strings.Repeat("═", 55))

	cmd.Process.Kill()
	cmd.Wait()

	fmt.Println("   ✅ Server stopped. You can close this window.")
	fmt.Println(strings.Repeat("═", 55))
}

// ═══════════════════════════════════════
// 🔥 FIREWALL RULE (Mobile access ke liye)
// ═══════════════════════════════════════

func addFirewallRule() {
	if runtime.GOOS != "windows" {
		return
	}
	// Check if rule already exists
	check := exec.Command("netsh", "advfirewall", "firewall", "show", "rule", "name=Electronics ERP 8080")
	if err := check.Run(); err == nil {
		return // Rule already exists
	}

	// Add firewall rule
	cmd := exec.Command("netsh", "advfirewall", "firewall", "add", "rule",
		"name=Electronics ERP 8080",
		"dir=in",
		"action=allow",
		"protocol=TCP",
		"localport=8080")
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️ Could not add firewall rule (run as admin for mobile access): %v", err)
	} else {
		log.Println("✅ Firewall rule added for port 8080 (mobile access enabled)")
	}
}

// ═══════════════════════════════════════
// 🎨 WELCOME SCREEN
// ═══════════════════════════════════════

func showWelcome() {
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("   🏪  ELECTRONICS ERP SYSTEM")
	fmt.Println("   ⚡  Rana Awais Electronics")
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println()
}

// ═══════════════════════════════════════
// 🔑 LICENSE CHECK
// ═══════════════════════════════════════

func checkLicense(port string) bool {
	// Call the backend API to check license status
	resp, err := http.Get(fmt.Sprintf("http://localhost:%s/api/license/status", port))
	if err != nil {
		// Server not ready yet - assume not activated
		return false
	}
	defer resp.Body.Close()

	var result struct {
		Activated bool   `json:"activated"`
		Valid     bool   `json:"valid"`
		Message   string `json:"message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false
	}

	return result.Activated && result.Valid
}

func showLicenseActivation(port string) {
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println("   🔑  LICENSE ACTIVATION REQUIRED")
	fmt.Println(strings.Repeat("═", 55))
	fmt.Println()
	fmt.Println("   This software requires a license key to activate.")
	fmt.Println()
	fmt.Println("   📋  PERMANENT LICENSE KEY:")
	fmt.Println("   ➜  Huziafaish1133@#$%")
	fmt.Println()
	fmt.Println("   💡  Yeh key PERMANENT hai - ek baar lagao, hamesha registered!")
	fmt.Println()

	for {
		fmt.Print("   🔑  Enter license key: ")
		reader := bufio.NewReader(os.Stdin)
		key, _ := reader.ReadString('\n')
		key = strings.TrimSpace(key)

		if key == "" {
			fmt.Println("   ❌  License key cannot be empty!")
			fmt.Println()
			continue
		}

		// Validate via backend API
		fmt.Print("   ⏳  Validating license...")
		resp, err := http.Post(
			fmt.Sprintf("http://localhost:%s/api/license/validate", port),
			"application/json",
			strings.NewReader(fmt.Sprintf(`{"licenseKey":"%s"}`, key)),
		)
		if err != nil {
			fmt.Println(" ❌")
			fmt.Printf("   ❌  Failed to connect to server: %v\n", err)
			fmt.Println()
			continue
		}

		var result struct {
			Valid   bool   `json:"valid"`
			Message string `json:"message"`
		}
		json.NewDecoder(resp.Body).Decode(&result)
		resp.Body.Close()

		if result.Valid {
			fmt.Println(" ✅")
			fmt.Println()
			fmt.Println(strings.Repeat("═", 55))
			fmt.Println("   ✅  LICENSE ACTIVATED SUCCESSFULLY!")
			fmt.Println(strings.Repeat("═", 55))
			fmt.Println()
			time.Sleep(1 * time.Second)
			return
		} else {
			fmt.Println(" ❌")
			fmt.Printf("   ❌  %s\n", result.Message)
			fmt.Println()
			fmt.Println("   💡  Use the PERMANENT key: Huziafaish1133@#$%")
			fmt.Println()
		}
	}
}

// ═══════════════════════════════════════
// 📋 CONFIGURATION
// ═══════════════════════════════════════

func loadConfig() *ServerConfig {
	config := &ServerConfig{
		Port:       DEFAULT_PORT,
		AutoStart:  true,
		Minimize:   true,
		BackupDir:  "backups",
		AutoBackup: true,
		BackupTime: "02:00",
		FirstRun:   false,
	}

	// Try to load existing config
	data, err := os.ReadFile(CONFIG_FILE)
	if err == nil {
		var loaded ServerConfig
		if json.Unmarshal(data, &loaded) == nil {
			config = &loaded
		}
	}

	return config
}

func saveConfig(config *ServerConfig) {
	data, _ := json.MarshalIndent(config, "", "  ")
	os.WriteFile(CONFIG_FILE, data, 0644)
}

// ═══════════════════════════════════════
// 🔍 BACKEND FINDER
// ═══════════════════════════════════════

func findBackend() string {
	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)

	paths := []string{
		filepath.Join(exeDir, "backend.exe"),
		filepath.Join(exeDir, "backend", "backend.exe"),
		filepath.Join(exeDir, "server.exe"),
		filepath.Join(exeDir, "backend", "server.exe"),
		filepath.Join(exeDir, "..", "backend.exe"),
		filepath.Join(exeDir, "..", "backend", "backend.exe"),
		"backend.exe",
		filepath.Join("backend", "backend.exe"),
		"server.exe",
		filepath.Join("backend", "server.exe"),
	}

	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			absPath, _ := filepath.Abs(p)
			return absPath
		}
	}

	return ""
}

// ═══════════════════════════════════════
// ⏳ WAIT FOR SERVER
// ═══════════════════════════════════════

func waitForServer(port string) bool {
	maxRetries := 60 // 60 * 500ms = 30 seconds max wait
	for i := 0; i < maxRetries; i++ {
		// Only check /api/health endpoint (GET)
		resp, err := http.Get(fmt.Sprintf("http://localhost:%s/api/health", port))
		if err == nil {
			resp.Body.Close()
			return true
		}
		time.Sleep(500 * time.Millisecond)
	}
	return false
}

// ═══════════════════════════════════════
// 🌐 OPEN BROWSER
// ═══════════════════════════════════════

func openBrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "windows":
		// Try multiple methods to open browser
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		if err != nil {
			// Fallback to cmd start
			err = exec.Command("cmd", "/c", "start", url).Start()
		}
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = exec.Command("xdg-open", url).Start()
	}

	if err != nil {
		log.Printf("Failed to open browser: %v", err)
		fmt.Printf("   ⚠️ Could not open browser automatically.\n")
		fmt.Printf("   📺 Open this URL manually: %s\n", url)
	}
}

// ═══════════════════════════════════════
// 🔔 NOTIFICATION
// ═══════════════════════════════════════

func showNotification(message string) {
	if runtime.GOOS == "windows" {
		// Simple notification using msg command
		exec.Command("msg", "*", fmt.Sprintf("Electronics ERP: %s", message)).Start()
	}
}

// ═══════════════════════════════════════
// 📝 LOGGING
// ═══════════════════════════════════════

func logError(msg string) {
	log.Printf("❌ ERROR: %s", msg)
}

func init() {
	// Set up logging to file
	logFile, err := os.OpenFile("server.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err == nil {
		log.SetOutput(io.MultiWriter(os.Stdout, logFile))
	}
}

// ═══════════════════════════════════════
// 🌐 GET LOCAL IP ADDRESS
// ═══════════════════════════════════════

func getLocalIP() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	for _, iface := range interfaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}

			if ip == nil || ip.IsLoopback() {
				continue
			}

			ip = ip.To4()
			if ip == nil {
				continue
			}

			if ip[0] == 169 || ip[0] == 127 {
				continue
			}

			return ip.String()
		}
	}

	return ""
}
