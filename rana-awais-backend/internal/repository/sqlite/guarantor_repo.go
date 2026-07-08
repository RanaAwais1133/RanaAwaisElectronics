package sqlite

import (
	"context"
	"database/sql"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type GuarantorRepository struct {
	db *sql.DB
}

func NewGuarantorRepository(db *sql.DB) *GuarantorRepository {
	return &GuarantorRepository{db: db}
}

func (r *GuarantorRepository) Create(ctx context.Context, g *domain.Guarantor) error {
	if g.ID == "" {
		g.ID = uuid.New().String()
	}
	g.CreatedAt = time.Now()
	g.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO guarantors (id, customer_id, name, name_urdu, father_name, father_name_urdu, phone, office_phone,
			cnic, cnic_image, photo, address, office_address, occupation, relation, relation_to_customer,
			verification_status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		g.ID, g.CustomerID, g.Name, g.NameUrdu, g.FatherName, g.FatherNameUrdu, g.Phone, g.OfficePhone,
		g.CNIC, g.CNICImage, g.Photo, g.Address, g.OfficeAddress, g.Occupation, g.Relation, g.RelationToCustomer,
		g.VerificationStatus, g.CreatedAt, g.UpdatedAt)
	return err
}

func (r *GuarantorRepository) GetByID(ctx context.Context, id string) (*domain.Guarantor, error) {
	g := &domain.Guarantor{}
	var nameUrdu, fatherName, fatherNameUrdu, officePhone, cnicImage, photo, address, officeAddress, occupation, relation, relationToCustomer sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, customer_id, name, name_urdu, father_name, father_name_urdu, phone, office_phone,
			cnic, cnic_image, photo, address, office_address, occupation, relation, relation_to_customer,
			verification_status, created_at, updated_at
		FROM guarantors WHERE id = ?`, id).Scan(
		&g.ID, &g.CustomerID, &g.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &g.Phone, &officePhone,
		&g.CNIC, &cnicImage, &photo, &address, &officeAddress, &occupation, &relation, &relationToCustomer,
		&g.VerificationStatus, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	g.NameUrdu = nameUrdu.String
	g.FatherName = fatherName.String
	g.FatherNameUrdu = fatherNameUrdu.String
	g.OfficePhone = officePhone.String
	g.CNICImage = cnicImage.String
	g.Photo = photo.String
	g.Address = address.String
	g.OfficeAddress = officeAddress.String
	g.Occupation = occupation.String
	g.Relation = relation.String
	g.RelationToCustomer = relationToCustomer.String
	return g, nil
}

func (r *GuarantorRepository) Update(ctx context.Context, id string, g *domain.Guarantor) error {
	g.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, `
		UPDATE guarantors SET customer_id=?, name=?, name_urdu=?, father_name=?, father_name_urdu=?, phone=?, office_phone=?,
			cnic=?, cnic_image=?, photo=?, address=?, office_address=?, occupation=?, relation=?, relation_to_customer=?,
			verification_status=?, updated_at=?
		WHERE id=?`,
		g.CustomerID, g.Name, g.NameUrdu, g.FatherName, g.FatherNameUrdu, g.Phone, g.OfficePhone,
		g.CNIC, g.CNICImage, g.Photo, g.Address, g.OfficeAddress, g.Occupation, g.Relation, g.RelationToCustomer,
		g.VerificationStatus, g.UpdatedAt, id)
	return err
}

func (r *GuarantorRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM guarantors WHERE id = ?", id)
	return err
}

func (r *GuarantorRepository) List(ctx context.Context, skip, limit int64) ([]domain.Guarantor, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, customer_id, name, name_urdu, father_name, father_name_urdu, phone, office_phone,
			cnic, cnic_image, photo, address, office_address, occupation, relation, relation_to_customer,
			verification_status, created_at, updated_at
		FROM guarantors ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var guarantors []domain.Guarantor
	for rows.Next() {
		var g domain.Guarantor
		var nameUrdu, fatherName, fatherNameUrdu, officePhone, cnicImage, photo, address, officeAddress, occupation, relation, relationToCustomer sql.NullString
		err := rows.Scan(&g.ID, &g.CustomerID, &g.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &g.Phone, &officePhone,
			&g.CNIC, &cnicImage, &photo, &address, &officeAddress, &occupation, &relation, &relationToCustomer,
			&g.VerificationStatus, &g.CreatedAt, &g.UpdatedAt)
		if err != nil {
			return nil, err
		}
		g.NameUrdu = nameUrdu.String
		g.FatherName = fatherName.String
		g.FatherNameUrdu = fatherNameUrdu.String
		g.OfficePhone = officePhone.String
		g.CNICImage = cnicImage.String
		g.Photo = photo.String
		g.Address = address.String
		g.OfficeAddress = officeAddress.String
		g.Occupation = occupation.String
		g.Relation = relation.String
		g.RelationToCustomer = relationToCustomer.String
		guarantors = append(guarantors, g)
	}
	return guarantors, nil
}

func (r *GuarantorRepository) ListByCustomer(ctx context.Context, customerID string) ([]domain.Guarantor, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, customer_id, name, name_urdu, father_name, father_name_urdu, phone, office_phone,
			cnic, cnic_image, photo, address, office_address, occupation, relation, relation_to_customer,
			verification_status, created_at, updated_at
		FROM guarantors WHERE customer_id = ? ORDER BY created_at`, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var guarantors []domain.Guarantor
	for rows.Next() {
		var g domain.Guarantor
		var nameUrdu, fatherName, fatherNameUrdu, officePhone, cnicImage, photo, address, officeAddress, occupation, relation, relationToCustomer sql.NullString
		err := rows.Scan(&g.ID, &g.CustomerID, &g.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &g.Phone, &officePhone,
			&g.CNIC, &cnicImage, &photo, &address, &officeAddress, &occupation, &relation, &relationToCustomer,
			&g.VerificationStatus, &g.CreatedAt, &g.UpdatedAt)
		if err != nil {
			return nil, err
		}
		g.NameUrdu = nameUrdu.String
		g.FatherName = fatherName.String
		g.FatherNameUrdu = fatherNameUrdu.String
		g.OfficePhone = officePhone.String
		g.CNICImage = cnicImage.String
		g.Photo = photo.String
		g.Address = address.String
		g.OfficeAddress = officeAddress.String
		g.Occupation = occupation.String
		g.Relation = relation.String
		g.RelationToCustomer = relationToCustomer.String
		guarantors = append(guarantors, g)
	}
	return guarantors, nil
}

func (r *GuarantorRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM guarantors").Scan(&count)
	return count, err
}
