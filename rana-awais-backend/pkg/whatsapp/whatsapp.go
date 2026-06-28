package whatsapp

import (
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/logger"
)

// Sender implements the WhatsAppSender interface for sending WhatsApp messages.
type Sender struct {
	APIKey string
}

// NewSender creates a WhatsApp sender with the given API key.
// If apiKey is empty, the sender will still be created, but Send() will silently succeed.
func NewSender(apiKey string) *Sender {
	return &Sender{APIKey: apiKey}
}

// Send sends a WhatsApp message to the given phone number.
// For now, it logs the message; replace with actual API call.
func (s *Sender) Send(phone, message string) error {
	if s.APIKey == "" {
		logger.Info("WhatsApp sender: no API key configured, skipping message")
		return nil
	}
	logger.Info("[WhatsApp] To: " + phone + " | Message: " + message)
	return nil
}
