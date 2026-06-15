package logger

import (
	"io"
	"log"
	"os"
	"time"
)

// Logger provides three severity levels: Info, Warn, Error.
// All logs are prefixed with a timestamp (RFC3339) and a level tag.
type Logger struct {
	info  *log.Logger
	warn  *log.Logger
	error *log.Logger
}

// New creates a Logger that writes info to out, warnings to warnOut, and errors to errOut.
// Pass the same writer for multiple levels if desired.
func New(out, warnOut, errOut io.Writer) *Logger {
	flags := log.LstdFlags
	return &Logger{
		info:  log.New(out, "[INFO]  ", flags),
		warn:  log.New(warnOut, "[WARN]  ", flags),
		error: log.New(errOut, "[ERROR] ", flags),
	}
}

// Info logs an informational message.
func (l *Logger) Info(msg string) {
	l.info.Printf("%s %s", time.Now().Format(time.RFC3339), msg)
}

// Warn logs a warning message.
func (l *Logger) Warn(msg string) {
	l.warn.Printf("%s %s", time.Now().Format(time.RFC3339), msg)
}

// Error logs an error message.
func (l *Logger) Error(msg string) {
	l.error.Printf("%s %s", time.Now().Format(time.RFC3339), msg)
}

// DefaultLogger is the package‑level logger used by the global convenience functions.
// It writes Info to stdout, and Warn/Error to stderr.
var DefaultLogger = New(os.Stdout, os.Stderr, os.Stderr)

// — Global convenience functions (backward compatible with your existing code) —

// InfoWithTimestamp logs an informational message using the default logger.
func InfoWithTimestamp(msg string) {
	DefaultLogger.Info(msg)
}

// ErrorWithTimestamp logs an error message using the default logger.
func ErrorWithTimestamp(msg string) {
	DefaultLogger.Error(msg)
}

// — Additional shorthand (optional) —

// Info logs an informational message using the default logger.
func Info(msg string) {
	DefaultLogger.Info(msg)
}

// Warn logs a warning using the default logger.
func Warn(msg string) {
	DefaultLogger.Warn(msg)
}

// Error logs an error using the default logger.
func Error(msg string) {
	DefaultLogger.Error(msg)
}