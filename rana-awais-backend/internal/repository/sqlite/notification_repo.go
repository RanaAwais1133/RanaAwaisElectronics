package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type NotificationRepository struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	n.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO notifications (id, customer_id, installment_plan_id, channel, message_en, message_ur, sent_at, status, fine_amount, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		n.ID, n.CustomerID, n.InstallmentPlanID, n.Channel, n.MessageEn, n.MessageUr, n.SentAt, n.Status, n.FineAmount, n.CreatedAt)
	return err
}

func (r *NotificationRepository) GetByCustomer(ctx context.Context, customerID string) ([]domain.Notification, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, customer_id, installment_plan_id, channel, message_en, message_ur, sent_at, status, fine_amount, created_at
		FROM notifications WHERE customer_id = ? ORDER BY created_at DESC`, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []domain.Notification
	for rows.Next() {
		var n domain.Notification
		var custID, planID sql.NullString
		err := rows.Scan(&n.ID, &custID, &planID, &n.Channel, &n.MessageEn, &n.MessageUr, &n.SentAt, &n.Status, &n.FineAmount, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		n.CustomerID = custID.String
		n.InstallmentPlanID = planID.String
		notifications = append(notifications, n)
	}
	return notifications, nil
}

func (r *NotificationRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE notifications SET status = ? WHERE id = ?", status, id)
	return err
}
