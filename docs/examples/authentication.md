# Authentication Example (Node.js/fetch)

```javascript
const login = async (email, password) => {
  const response = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  return data.token; // Save this token for subsequent requests
};

// Usage
login('admin@birthvoices.com', 'securepassword')
  .then(token => console.log('JWT:', token))
  .catch(console.error);
```
