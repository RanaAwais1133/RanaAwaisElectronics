package thermal

import (
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/logger"
)

// Printer defines the interface for bilingual thermal receipt printing.
type Printer interface {
	PrintBilingual(headerEn, headerUr, bodyEn, bodyUr string) error
}

// ConsolePrinter is a simple implementation that prints to the application log (for development).
type ConsolePrinter struct{}

// NewConsolePrinter creates a new ConsolePrinter.
func NewConsolePrinter() *ConsolePrinter {
	return &ConsolePrinter{}
}

// PrintBilingual logs the receipt content (simulating thermal print).
func (cp *ConsolePrinter) PrintBilingual(headerEn, headerUr, bodyEn, bodyUr string) error {
	logger.Info("Thermal Print")
	logger.Info("=== " + headerEn + " / " + headerUr + " ===")
	logger.Info(bodyEn)
	logger.Info(bodyUr)
	logger.Info("==========================")
	return nil
}

// NoOpPrinter is a silent printer that does nothing (used when no printer is configured).
type NoOpPrinter struct{}

// PrintBilingual does nothing and returns no error.
func (n *NoOpPrinter) PrintBilingual(headerEn, headerUr, bodyEn, bodyUr string) error {
	return nil
}

// NewPrinter creates a printer instance based on the given configuration.
// If the endpoint string is empty, a NoOpPrinter is returned.
// In production, you can expand this to return a real thermal printer client.
func NewPrinter(endpoint string) Printer {
	if endpoint == "" {
		return &NoOpPrinter{}
	}
	// TODO: if endpoint is a valid URL, return a real network printer.
	return NewConsolePrinter() // fallback for development
}
