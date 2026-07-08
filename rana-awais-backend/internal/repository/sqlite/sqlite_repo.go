package sqlite

import (
	"database/sql"
	"log"
)

func InitSchema(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL,
		display_name TEXT NOT NULL DEFAULT '',
		display_name_ur TEXT DEFAULT '',
		phone TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS customers (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		name_urdu TEXT DEFAULT '',
		father_name TEXT DEFAULT '',
		father_name_urdu TEXT DEFAULT '',
		phone TEXT DEFAULT '',
		cnic TEXT DEFAULT '',
		cnic_image TEXT DEFAULT '',
		address TEXT DEFAULT '',
		address_urdu TEXT DEFAULT '',
		residential TEXT DEFAULT '',
		occupant TEXT DEFAULT '',
		residential_address TEXT DEFAULT '',
		office_address TEXT DEFAULT '',
		account_no TEXT DEFAULT '',
		cost_no TEXT DEFAULT '',
		process_no TEXT DEFAULT '',
		prep_ac TEXT DEFAULT '',
		remarks TEXT DEFAULT '',
		completed_remarks TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS guarantors (
		id TEXT PRIMARY KEY,
		customer_id TEXT NOT NULL,
		name TEXT NOT NULL,
		name_urdu TEXT DEFAULT '',
		father_name TEXT DEFAULT '',
		father_name_urdu TEXT DEFAULT '',
		phone TEXT DEFAULT '',
		office_phone TEXT DEFAULT '',
		cnic TEXT DEFAULT '',
		cnic_image TEXT DEFAULT '',
		photo TEXT DEFAULT '',
		address TEXT DEFAULT '',
		office_address TEXT DEFAULT '',
		occupation TEXT DEFAULT '',
		relation TEXT DEFAULT '',
		relation_to_customer TEXT DEFAULT '',
		verification_status TEXT DEFAULT 'pending',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME,
		FOREIGN KEY (customer_id) REFERENCES customers(id)
	);

	CREATE TABLE IF NOT EXISTS products (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		name_urdu TEXT DEFAULT '',
		company TEXT DEFAULT '',
		company_urdu TEXT DEFAULT '',
		category TEXT DEFAULT '',
		price REAL DEFAULT 0,
		purchase_price REAL DEFAULT 0,
		description TEXT DEFAULT '',
		in_stock INTEGER DEFAULT 1,
		stock_count INTEGER DEFAULT 0,
		sku TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS inventory_items (
		id TEXT PRIMARY KEY,
		product_id TEXT NOT NULL,
		serial_number TEXT DEFAULT '',
		color TEXT DEFAULT '',
		model TEXT DEFAULT '',
		engine_no TEXT DEFAULT '',
		chassis_no TEXT DEFAULT '',
		imei TEXT DEFAULT '',
		company TEXT DEFAULT '',
		status TEXT DEFAULT 'in_stock',
		purchase_date DATETIME,
		purchase_price REAL DEFAULT 0,
		selling_price REAL DEFAULT 0,
		sold_date DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME,
		FOREIGN KEY (product_id) REFERENCES products(id)
	);

	CREATE TABLE IF NOT EXISTS installment_plans (
		id TEXT PRIMARY KEY,
		customer_id TEXT NOT NULL,
		product_id TEXT DEFAULT '',
		inventory_item_id TEXT DEFAULT '',
		total_amount REAL DEFAULT 0,
		down_payment REAL DEFAULT 0,
		remaining_amount REAL DEFAULT 0,
		num_installments INTEGER DEFAULT 0,
		installment_amount REAL DEFAULT 0,
		start_date DATETIME,
		end_date DATETIME,
		grace_period_days INTEGER DEFAULT 0,
		fine_per_day REAL DEFAULT 0,
		fine_type TEXT DEFAULT 'per_day',
		fixed_fine_amount REAL DEFAULT 0,
		status TEXT DEFAULT 'active',
		installment_date INTEGER DEFAULT 1,
		payment_type TEXT DEFAULT '',
		serial_number TEXT DEFAULT '',
		imei TEXT DEFAULT '',
		engine_no TEXT DEFAULT '',
		chassis_no TEXT DEFAULT '',
		model TEXT DEFAULT '',
		color TEXT DEFAULT '',
		company TEXT DEFAULT '',
		process_fee REAL DEFAULT 0,
		discount REAL DEFAULT 0,
		salary_income REAL DEFAULT 0,
		defaulter TEXT DEFAULT '',
		pto TEXT DEFAULT '',
		vpn_status TEXT DEFAULT '',
		employee_status TEXT DEFAULT '',
		dbm_remarks TEXT DEFAULT '',
		crc_remarks TEXT DEFAULT '',
		process_at TEXT DEFAULT '',
		do_officer TEXT DEFAULT '',
		mark_off TEXT DEFAULT '',
		debt_mng TEXT DEFAULT '',
		second_mng TEXT DEFAULT '',
		insp_off TEXT DEFAULT '',
		srm TEXT DEFAULT '',
		mobile_phone TEXT DEFAULT '',
		crc TEXT DEFAULT '',
		created_by TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME,
		FOREIGN KEY (customer_id) REFERENCES customers(id)
	);

	CREATE TABLE IF NOT EXISTS installment_details (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		plan_id TEXT NOT NULL,
		installment_no INTEGER NOT NULL,
		due_date DATETIME,
		amount REAL DEFAULT 0,
		paid INTEGER DEFAULT 0,
		paid_date DATETIME,
		fine REAL DEFAULT 0,
		fine_per_day REAL DEFAULT 0,
		days_late INTEGER DEFAULT 0,
		fine_applied REAL DEFAULT 0,
		total_payable REAL DEFAULT 0,
		partial_paid REAL DEFAULT 0,
		remaining REAL DEFAULT 0,
		collected_by TEXT DEFAULT '',
		collected_by_id TEXT DEFAULT '',
		remarks TEXT DEFAULT '',
		FOREIGN KEY (plan_id) REFERENCES installment_plans(id)
	);

	CREATE TABLE IF NOT EXISTS payments (
		id TEXT PRIMARY KEY,
		installment_plan_id TEXT NOT NULL,
		installment_no INTEGER DEFAULT 0,
		amount REAL DEFAULT 0,
		amount_without_fine REAL DEFAULT 0,
		fine_paid REAL DEFAULT 0,
		method TEXT DEFAULT 'cash',
		receipt_number TEXT DEFAULT '',
		transaction_date DATETIME,
		payment_date DATETIME,
		collected_by TEXT DEFAULT '',
		collected_by_id TEXT DEFAULT '',
		recovery_officer TEXT DEFAULT '',
		remarks TEXT DEFAULT '',
		is_full_payment INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (installment_plan_id) REFERENCES installment_plans(id)
	);

	CREATE TABLE IF NOT EXISTS accounting_entries (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		basis TEXT DEFAULT '',
		amount REAL DEFAULT 0,
		description TEXT DEFAULT '',
		related_plan_id TEXT DEFAULT '',
		related_payment_id TEXT DEFAULT '',
		fine_amount REAL DEFAULT 0,
		date DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS notifications (
		id TEXT PRIMARY KEY,
		customer_id TEXT DEFAULT '',
		installment_plan_id TEXT DEFAULT '',
		channel TEXT DEFAULT 'sms',
		message_en TEXT DEFAULT '',
		message_ur TEXT DEFAULT '',
		sent_at DATETIME,
		status TEXT DEFAULT 'pending',
		fine_amount REAL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS license (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		license_key TEXT UNIQUE NOT NULL,
		client_name TEXT NOT NULL DEFAULT '',
		expiry_date DATE NOT NULL,
		is_active INTEGER DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS audit_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		action TEXT NOT NULL DEFAULT '',
		entity TEXT NOT NULL DEFAULT '',
		entity_id TEXT DEFAULT '',
		user_id TEXT DEFAULT '',
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		details TEXT DEFAULT ''
	);

	CREATE TABLE IF NOT EXISTS sync_logs (
		id TEXT PRIMARY KEY,
		entity TEXT NOT NULL DEFAULT '',
		entity_id TEXT NOT NULL DEFAULT '',
		operation TEXT NOT NULL DEFAULT '',
		data TEXT DEFAULT '{}',
		status TEXT NOT NULL DEFAULT 'pending',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		synced_at DATETIME,
		error TEXT,
		retry_count INTEGER NOT NULL DEFAULT 0,
		last_attempt DATETIME
	);


	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL DEFAULT ''
	);

	CREATE TABLE IF NOT EXISTS promises (
		id TEXT PRIMARY KEY,
		customer_id TEXT NOT NULL,
		plan_id TEXT NOT NULL,
		installment_no INTEGER DEFAULT 0,
		promise_date DATETIME NOT NULL,
		amount REAL DEFAULT 0,
		status TEXT DEFAULT 'pending',
		remarks TEXT DEFAULT '',
		created_by TEXT DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (customer_id) REFERENCES customers(id),
		FOREIGN KEY (plan_id) REFERENCES installment_plans(id)
	);

	CREATE INDEX IF NOT EXISTS idx_promises_customer_id ON promises(customer_id);
	CREATE INDEX IF NOT EXISTS idx_promises_status ON promises(status);
	CREATE INDEX IF NOT EXISTS idx_promises_promise_date ON promises(promise_date);

	CREATE INDEX IF NOT EXISTS idx_installment_details_plan_id ON installment_details(plan_id);
	CREATE INDEX IF NOT EXISTS idx_installment_details_due_date ON installment_details(due_date);
	CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON payments(installment_plan_id);
	CREATE INDEX IF NOT EXISTS idx_payments_transaction_date ON payments(transaction_date);
	CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
	CREATE INDEX IF NOT EXISTS idx_guarantors_customer_id ON guarantors(customer_id);
	CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);
	CREATE INDEX IF NOT EXISTS idx_installment_plans_customer_id ON installment_plans(customer_id);
	CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON installment_plans(status);
	CREATE INDEX IF NOT EXISTS idx_accounting_entries_date ON accounting_entries(date);
	`

	_, err := db.Exec(schema)
	if err != nil {
		log.Printf("Error creating schema: %v", err)
		return err
	}

	log.Println("Database schema initialized successfully")
	return nil
}
