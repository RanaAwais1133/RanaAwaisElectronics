package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"github.com/google/uuid"
)

type CustomerRepository struct {
	db *sql.DB
}

func NewCustomerRepository(db *sql.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) Create(ctx context.Context, c *domain.Customer) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()

	guarantorIDs, _ := json.Marshal(c.GuarantorIDs)

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO customers (id, name, name_urdu, father_name, father_name_urdu, phone, cnic, cnic_image,
			address, address_urdu, residential, occupant, residential_address, office_address,
			account_no, cost_no, process_no, prep_ac, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.NameUrdu, c.FatherName, c.FatherNameUrdu, c.Phone, c.CNIC, c.CNICImage,
		c.Address, c.AddressUrdu, c.Residential, c.Occupant, c.ResidentialAddress, c.OfficeAddress,
		c.AccountNo, c.CostNo, c.ProcessNo, c.PrepAC, c.CreatedAt, c.UpdatedAt)
	if err != nil {
		return err
	}

	// Store guarantor IDs in a separate table or as JSON
	_ = guarantorIDs
	return nil
}

func (r *CustomerRepository) GetByID(ctx context.Context, id string) (*domain.Customer, error) {
	c := &domain.Customer{}
	var nameUrdu, fatherName, fatherNameUrdu, cnicImage, addressUrdu, residential, occupant, residentialAddress, officeAddress, accountNo, costNo, processNo, prepAC sql.NullString

	err := r.db.QueryRowContext(ctx, `
		SELECT id, name, name_urdu, father_name, father_name_urdu, phone, cnic, cnic_image,
			address, address_urdu, residential, occupant, residential_address, office_address,
			account_no, cost_no, process_no, prep_ac, created_at, updated_at
		FROM customers WHERE id = ?`, id).Scan(
		&c.ID, &c.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &c.Phone, &c.CNIC, &cnicImage,
		&c.Address, &addressUrdu, &residential, &occupant, &residentialAddress, &officeAddress,
		&accountNo, &costNo, &processNo, &prepAC, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	c.NameUrdu = nameUrdu.String
	c.FatherName = fatherName.String
	c.FatherNameUrdu = fatherNameUrdu.String
	c.CNICImage = cnicImage.String
	c.AddressUrdu = addressUrdu.String
	c.Residential = residential.String
	c.Occupant = occupant.String
	c.ResidentialAddress = residentialAddress.String
	c.OfficeAddress = officeAddress.String
	c.AccountNo = accountNo.String
	c.CostNo = costNo.String
	c.ProcessNo = processNo.String
	c.PrepAC = prepAC.String
	c.GuarantorIDs = []string{}

	return c, nil
}

func (r *CustomerRepository) GetByPhone(ctx context.Context, phone string) (*domain.Customer, error) {
	c := &domain.Customer{}
	var nameUrdu, fatherName, fatherNameUrdu, cnicImage, addressUrdu, residential, occupant, residentialAddress, officeAddress, accountNo, costNo, processNo, prepAC sql.NullString

	err := r.db.QueryRowContext(ctx, `
		SELECT id, name, name_urdu, father_name, father_name_urdu, phone, cnic, cnic_image,
			address, address_urdu, residential, occupant, residential_address, office_address,
			account_no, cost_no, process_no, prep_ac, created_at, updated_at
		FROM customers WHERE phone = ?`, phone).Scan(
		&c.ID, &c.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &c.Phone, &c.CNIC, &cnicImage,
		&c.Address, &addressUrdu, &residential, &occupant, &residentialAddress, &officeAddress,
		&accountNo, &costNo, &processNo, &prepAC, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	c.NameUrdu = nameUrdu.String
	c.FatherName = fatherName.String
	c.FatherNameUrdu = fatherNameUrdu.String
	c.CNICImage = cnicImage.String
	c.AddressUrdu = addressUrdu.String
	c.Residential = residential.String
	c.Occupant = occupant.String
	c.ResidentialAddress = residentialAddress.String
	c.OfficeAddress = officeAddress.String
	c.AccountNo = accountNo.String
	c.CostNo = costNo.String
	c.ProcessNo = processNo.String
	c.PrepAC = prepAC.String
	c.GuarantorIDs = []string{}

	return c, nil
}

func (r *CustomerRepository) Update(ctx context.Context, id string, c *domain.Customer) error {
	c.UpdatedAt = time.Now()
	_, err := r.db.ExecContext(ctx, `
		UPDATE customers SET name=?, name_urdu=?, father_name=?, father_name_urdu=?, phone=?, cnic=?, cnic_image=?,
			address=?, address_urdu=?, residential=?, occupant=?, residential_address=?, office_address=?,
			account_no=?, cost_no=?, process_no=?, prep_ac=?, updated_at=?
		WHERE id=?`,
		c.Name, c.NameUrdu, c.FatherName, c.FatherNameUrdu, c.Phone, c.CNIC, c.CNICImage,
		c.Address, c.AddressUrdu, c.Residential, c.Occupant, c.ResidentialAddress, c.OfficeAddress,
		c.AccountNo, c.CostNo, c.ProcessNo, c.PrepAC, c.UpdatedAt, id)
	return err
}

func (r *CustomerRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM customers WHERE id = ?", id)
	return err
}

func (r *CustomerRepository) List(ctx context.Context, skip, limit int64) ([]domain.Customer, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, name_urdu, father_name, father_name_urdu, phone, cnic, cnic_image,
			address, address_urdu, residential, occupant, residential_address, office_address,
			account_no, cost_no, process_no, prep_ac, created_at, updated_at
		FROM customers ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var customers []domain.Customer
	for rows.Next() {
		var c domain.Customer
		var nameUrdu, fatherName, fatherNameUrdu, cnicImage, addressUrdu, residential, occupant, residentialAddress, officeAddress, accountNo, costNo, processNo, prepAC sql.NullString
		err := rows.Scan(&c.ID, &c.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &c.Phone, &c.CNIC, &cnicImage,
			&c.Address, &addressUrdu, &residential, &occupant, &residentialAddress, &officeAddress,
			&accountNo, &costNo, &processNo, &prepAC, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}
		c.NameUrdu = nameUrdu.String
		c.FatherName = fatherName.String
		c.FatherNameUrdu = fatherNameUrdu.String
		c.CNICImage = cnicImage.String
		c.AddressUrdu = addressUrdu.String
		c.Residential = residential.String
		c.Occupant = occupant.String
		c.ResidentialAddress = residentialAddress.String
		c.OfficeAddress = officeAddress.String
		c.AccountNo = accountNo.String
		c.CostNo = costNo.String
		c.ProcessNo = processNo.String
		c.PrepAC = prepAC.String
		c.GuarantorIDs = []string{}
		customers = append(customers, c)
	}
	return customers, nil
}

func (r *CustomerRepository) Search(ctx context.Context, query string, skip, limit int64) ([]domain.Customer, error) {
	searchQuery := "%" + query + "%"
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, name, name_urdu, father_name, father_name_urdu, phone, cnic, cnic_image,
			address, address_urdu, residential, occupant, residential_address, office_address,
			account_no, cost_no, process_no, prep_ac, created_at, updated_at
		FROM customers 
		WHERE name LIKE ? OR name_urdu LIKE ? OR father_name LIKE ? OR father_name_urdu LIKE ? 
			OR phone LIKE ? OR cnic LIKE ? OR account_no LIKE ? OR cost_no LIKE ? OR process_no LIKE ?
		ORDER BY created_at DESC LIMIT ? OFFSET ?`,
		searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, limit, skip)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var customers []domain.Customer
	for rows.Next() {
		var c domain.Customer
		var nameUrdu, fatherName, fatherNameUrdu, cnicImage, addressUrdu, residential, occupant, residentialAddress, officeAddress, accountNo, costNo, processNo, prepAC sql.NullString
		err := rows.Scan(&c.ID, &c.Name, &nameUrdu, &fatherName, &fatherNameUrdu, &c.Phone, &c.CNIC, &cnicImage,
			&c.Address, &addressUrdu, &residential, &occupant, &residentialAddress, &officeAddress,
			&accountNo, &costNo, &processNo, &prepAC, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}
		c.NameUrdu = nameUrdu.String
		c.FatherName = fatherName.String
		c.FatherNameUrdu = fatherNameUrdu.String
		c.CNICImage = cnicImage.String
		c.AddressUrdu = addressUrdu.String
		c.Residential = residential.String
		c.Occupant = occupant.String
		c.ResidentialAddress = residentialAddress.String
		c.OfficeAddress = officeAddress.String
		c.AccountNo = accountNo.String
		c.CostNo = costNo.String
		c.ProcessNo = processNo.String
		c.PrepAC = prepAC.String
		c.GuarantorIDs = []string{}
		customers = append(customers, c)
	}
	return customers, nil
}

func (r *CustomerRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM customers").Scan(&count)
	return count, err
}
