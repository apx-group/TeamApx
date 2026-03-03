package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// saveUploadedImage speichert ein hochgeladenes Bild als WebP.
// Gibt den URL-Pfad zurück (z.B. "/public/uploads/profile/123.webp").
func saveUploadedImage(file io.Reader, uploadDir, subDir, filename string) (string, error) {
	data, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("read file: %w", err)
	}

	const maxSize = 10 * 1024 * 1024
	if len(data) > maxSize {
		return "", fmt.Errorf("file too large (max 10 MB)")
	}

	contentType := http.DetectContentType(data)
	if !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("not an image file")
	}

	dir := filepath.Join(uploadDir, subDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("create upload dir: %w", err)
	}

	// Temp-Datei für cwebp-Eingabe
	tmp, err := os.CreateTemp("", "upload-*")
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return "", fmt.Errorf("write temp file: %w", err)
	}
	tmp.Close()

	outPath := filepath.Join(dir, filename+".webp")
	cmd := exec.Command("cwebp", "-q", "85", tmpPath, "-o", outPath)
	if err := cmd.Run(); err == nil {
		return "/public/uploads/" + subDir + "/" + filename + ".webp", nil
	}

	// Fallback: Originaldatei speichern wenn cwebp nicht verfügbar
	ext := extensionForContentType(contentType)
	outPath = filepath.Join(dir, filename+ext)
	if err := os.WriteFile(outPath, data, 0644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}
	return "/public/uploads/" + subDir + "/" + filename + ext, nil
}

func extensionForContentType(ct string) string {
	switch {
	case strings.Contains(ct, "jpeg"):
		return ".jpg"
	case strings.Contains(ct, "png"):
		return ".png"
	case strings.Contains(ct, "gif"):
		return ".gif"
	case strings.Contains(ct, "webp"):
		return ".webp"
	default:
		return ".bin"
	}
}
