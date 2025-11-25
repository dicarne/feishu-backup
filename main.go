package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os/exec"
	"runtime"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//go:embed dist/*
var webDir embed.FS

func main() {
	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowCredentials = true
	config.AllowHeaders = []string{"Authorization"}
	r.Use(cors.New(config))

	staticFp, _ := fs.Sub(webDir, "dist")

	debug := flag.Bool("debug", false, "用于本地Web开发")
	flag.Parse()

	if *debug {
		r.Any("/feishu-backup/*proxyPath", proxydev)
	} else {
		r.StaticFS("/feishu-backup", http.FS(staticFp))
	}
	r.Any("/api/feishu/*proxyPath", proxy)
	r.GET("/ping", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"code": 0})
	})
	Open(`http://127.0.0.1:18900/feishu-backup`)
	r.Run("0.0.0.0:18900")
}

func proxy(c *gin.Context) {
	remote, err := url.Parse("https://open.feishu.cn")
	if err != nil {
		panic(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(remote)
	proxy.Director = func(req *http.Request) {
		req.Header = c.Request.Header
		req.Host = remote.Host
		req.URL.Scheme = remote.Scheme
		req.URL.Host = remote.Host
		req.URL.Path = "/open-apis" + c.Param("proxyPath")
	}

	proxy.ServeHTTP(c.Writer, c.Request)
}

func proxydev(c *gin.Context) {
	remote, err := url.Parse("http://localhost:3800")
	if err != nil {
		panic(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(remote)
	proxy.Director = func(req *http.Request) {
		req.Header = c.Request.Header
		req.Host = remote.Host
		req.URL.Scheme = remote.Scheme
		req.URL.Host = remote.Host
		req.URL.Path = "/feishu-backup" + c.Param("proxyPath")
	}

	proxy.ServeHTTP(c.Writer, c.Request)
}

var commands = map[string]string{
	"windows": "start",
	"darwin":  "open",
	"linux":   "xdg-open",
}

func Open(uri string) error {
	run, ok := commands[runtime.GOOS]
	if !ok {
		return fmt.Errorf("don't know how to open things on %s platform", runtime.GOOS)
	}

	if runtime.GOOS == "windows" {
		cmd := exec.Command("cmd", "/C", "start", uri)
		return cmd.Start()

	} else {
		cmd := exec.Command(run, uri)
		return cmd.Start()
	}
}
