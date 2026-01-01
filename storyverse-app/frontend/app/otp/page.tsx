"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OTPPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!phone) {
      setMessage('Enter phone number');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setMessage('OTP sent to your phone');
      } else {
        setMessage(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setMessage('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setMessage('Enter OTP');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`http://localhost:4000/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        router.push('/stories');
      } else {
        setMessage(data.error || 'Failed to verify OTP');
      }
    } catch (err) {
      setMessage('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Login with Phone OTP</h2>
      {!otpSent ? (
        <div>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
          />
          <button onClick={handleRequestOtp} disabled={loading} style={{ marginLeft: '0.5rem' }}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
          />
          <button onClick={handleVerifyOtp} disabled={loading} style={{ marginLeft: '0.5rem' }}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}