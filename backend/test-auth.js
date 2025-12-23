// Simple test to verify password hashing
import bcrypt from 'bcrypt';

async function testPassword() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  const isValid = await bcrypt.compare(password, hash);
  console.log('Validation result:', isValid);
  
  // Test with wrong password
  const wrongPassword = 'wrong';
  const isWrong = await bcrypt.compare(wrongPassword, hash);
  console.log('Wrong password result:', isWrong);
}

testPassword().catch(console.error);