package sms

import (
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/pkg/logger"
)

// Sender implements the SmsSender interface for sending SMS messages.
type Sender struct {
	Endpoint string
}

// NewSender creates an SMS sender with the given API endpoint.
// If endpoint is empty, the sender will still be created, but Send() will silently succeed.
func NewSender(endpoint string) *Sender {
	return &Sender{Endpoint: endpoint}
}

// Send sends an SMS message to the given phone number.
// For now, it logs the message; replace with actual API call.
func (s *Sender) Send(phone, message string) error {
	if s.Endpoint == "" {
		logger.Info("SMS sender: no endpoint configured, skipping SMS")
		return nil
	}
	logger.Info("[SMS] To: " + phone + " | Message: " + message)
	return nil
}
