import bcrypt from 'bcryptjs';
// const bcrypt = bycrbcryptjs;

const password = 'Suraj@2001';  // Replace with actual password
const hashedPassword = await bcrypt.hash(password, 10);  // Hash the password with a salt round of 10

console.log('Hashed password:', hashedPassword);
