import axios from 'axios';

async function testAuth() {
  try {
    console.log('Testing authentication endpoint...');
    
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAuth();