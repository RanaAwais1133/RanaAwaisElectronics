package service

import (
    "context"
    "errors"

    "github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
    "github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "golang.org/x/crypto/bcrypt"
)

type UserService struct {
    repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) Create(ctx context.Context, user *domain.User, password string) error {
    existing, _ := s.repo.GetByUsername(ctx, user.Username)
    if existing != nil {
        return errors.New("username already exists")
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    user.PasswordHash = string(hash)
    return s.repo.Create(ctx, user)
}

func (s *UserService) Authenticate(ctx context.Context, username, password string) (*domain.User, error) {
    user, err := s.repo.GetByUsername(ctx, username)
    if err != nil || user == nil {
        return nil, errors.New("invalid credentials")
    }
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
        return nil, errors.New("invalid credentials")
    }
    return user, nil
}

func (s *UserService) GetByID(ctx context.Context, id primitive.ObjectID) (*domain.User, error) {
    return s.repo.GetByID(ctx, id)
}

func (s *UserService) List(ctx context.Context, skip, limit int64) ([]domain.User, error) {
    return s.repo.List(ctx, skip, limit)
}

func (s *UserService) Update(ctx context.Context, id primitive.ObjectID, user *domain.User) error {
    return s.repo.Update(ctx, id, user)
}

func (s *UserService) Delete(ctx context.Context, id primitive.ObjectID) error {
    return s.repo.Delete(ctx, id)
}

func (s *UserService) Count(ctx context.Context) (int64, error) {
    return s.repo.Count(ctx)
}

// ✅ NEW: Update user password
func (s *UserService) UpdatePassword(ctx context.Context, id primitive.ObjectID, newPassword string) error {
    user, err := s.repo.GetByID(ctx, id)
    if err != nil || user == nil {
        return errors.New("user not found")
    }
    hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    user.PasswordHash = string(hash)
    return s.repo.Update(ctx, id, user)
}

// ✅ NEW: Get users by role
func (s *UserService) GetUsersByRole(ctx context.Context, role string) ([]domain.User, error) {
    // We'll list all and filter (could be optimized with a repository method)
    users, err := s.repo.List(ctx, 0, 999999)
    if err != nil {
        return nil, err
    }
    var filtered []domain.User
    for _, u := range users {
        if u.Role == role {
            filtered = append(filtered, u)
        }
    }
    return filtered, nil
}
