## UNUTUK MENDAFTARKAN ADMIN

# cd Back End

# ketik

node

# ketik

const bcrypt = require('bcryptjs'); bcrypt.hashSync('isi_paswordnya', 10)

# lalu akan mendapat kan token '$2a$10$FwqOJkBQGFaW3CqXs56Up.w1MZzQIWqB9yD1A47LB8o7GhOq7RmZa'

# Stelah itu run di schema.sql

INSERT INTO users (name, email, password, role)
VALUES (
'Admin Utama',
'admin@lms.com',
'$2a$10$riZ7/eA5vwSCrLuz1arfneg.ppXVWaV.ATJKLNcVjgC22j1uikfQ6',
'admin'
);
