package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO users (id, username, password_hash, role, display_name, display_name_ur, phone, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.Username, user.PasswordHash, user.Role, user.DisplayName, user.DisplayNameUr, user.Phone, user.CreatedAt, user.UpdatedAt)
	return err
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	user := &domain.User{}
	var displayNameUr, phone sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, role, display_name, display_name_ur, phone, created_at, updated_at
		FROM users WHERE username = ?`, username).Scan(
		&user.ID, &user.Username, &user.PasswordHash, &user.Role, &user.DisplayName, &displayNameUr, &phone, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	user.DisplayNameUr = displayNameUr.String
	user.Phone = phone.String
	return user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	user := &domain.User{}
	var displayNameUr, phone sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, role, display_name, display_name_ur, phone, created_at, updated_at
		FROM users WHERE id = ?`, id).Scan(
		&user.ID, &user.Username, &user.PasswordHash, &user.Role, &user.DisplayName, &displayNameUr, &phone, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	user.DisplayNameUr = displayNameUr.String
	user.Phone = phone.String
	return user, nil
}

func (r *UserRepository) List(ctx context.Context, skip, limit int64) ([]domain.User, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, username, password_hash, role, display_name, display_name_ur, phone, created_at, updated_at
		FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		var displayNameUr, phone sql.NullString
		err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.DisplayName, &displayNameUr, &phone, &u.CreatedAt, &u.UpdatedAt)
		if err != nil {
			return nil, err
		}
		u.DisplayNameUr = displayNameUr.String
		u.Phone = phone.String
		users = append(users, u)
	}
	return users, nil
}

func (r *UserRepository) Update(ctx context.Context, id string, user *domain.User) error {
	user.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, `
		UPDATE users SET username=?, password_hash=?, role=?, display_name=?, display_name_ur=?, phone=?, updated_at=?
		WHERE id=?`,
		user.Username, user.PasswordHash, user.Role, user.DisplayName, user.DisplayNameUr, user.Phone, user.UpdatedAt, id)
	return err
}

func (r *UserRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = ?", id)
	return err
}

func (r *UserRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}
