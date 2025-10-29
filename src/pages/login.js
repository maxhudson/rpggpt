// pages/login.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
// import { Checkbox } from "antd";
// import { Button, Label, Text, Input } from '@/components';

var Button = ({ primary, skew, style, onClick, label }) => (
  <button
    onClick={onClick}
    style={{
      ...style,
      backgroundColor: primary ? '#0070f3' : 'transparent',
      color: primary ? '#fff' : '#000',
      border: primary ? 'none' : '1px solid #ccc',
      padding: '10px 20px',
      cursor: 'pointer',
      transition: 'background-color 0.2s, color 0.2s'
    }}
  >
    {label}
  </button>
);

var Label = ({ children, style }) => (
  <label style={{ fontWeight: 'bold', ...style }}>{children}</label>
);

var Text = ({ children, style }) => (
  <p style={{ marginBottom: '1rem', ...style }}>{children}</p>
);

var Input = ({ type, placeholder, value, onChange, required, skew, containerStyle }) => (
  <div style={{ ...containerStyle }}>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      style={{
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '16px',
        boxSizing: 'border-box'
      }}
    />
  </div>
);

var Checkbox = ({ onChange, style }) => (
  <input
    type="checkbox"
    onChange={onChange}
    style={{
      width: '16px',
      height: '16px',
      marginRight: '8px',
      ...style
    }}
  />
);


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleLogin = async (type) => {
    if (!agreedToTerms && type === 'SIGNUP') {
      alert('You must agree to the terms to continue.');
      return;
    }

    setError(null);
    let { data, error } = type === 'LOGIN'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    console.log(type);
    if (type === 'SIGNUP' && !error) {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, userId: data.user.id })
      });
    }

    if (type === 'LOGIN' && !error) {
      window.location.href = '/'
    }

    if (type === 'SIGNUP' && !error) alert('Please check your email for a login link!');

    if (error) alert(error.message);
  };

  const forgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert(error.message);
    }
    else {
      alert('Password reset email sent. Check your inbox.');
    }
  }

  // Generate noise pattern
  const [noisePattern, setNoisePattern] = useState('');

  useEffect(() => {
    // Create a noise pattern with CSS
    const generateNoisePattern = () => {
      let pattern = '';
      for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * 100);
        const y = Math.floor(Math.random() * 100);
        const size = Math.floor(Math.random() * 2) + 1;
        const opacity = Math.random() * 0.05;
        pattern += `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(0, 0, 0, ${opacity}) 0%, transparent 100%),`;
      }
      return pattern.slice(0, -1); // Remove trailing comma
    };

    setNoisePattern(generateNoisePattern());
  }, []);

  return (
    <div className='login-page login-container' style={{
      height: '100vh',
      width: '100vw',
      backgroundSize: 'cover',
      display: 'flex',
      backgroundColor: '#eeeeee',
      position: 'relative',
      overflow: 'hidden',
      background: noisePattern ? `${noisePattern}` : '#eeeeee'
    }}>
      {/* Top left square with border */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        left: '1.5rem',
        width: '1.5rem',
        height: '1.5rem',
        borderTop: '1px solid rgba(0, 0, 0, 0.3)',
        borderLeft: '1px solid rgba(0, 0, 0, 0.3)'
      }} />

      {/* Top right square filled */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        width: '1.5rem',
        height: '1.5rem',
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      }} />
      <div className='login-content' style={{
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div></div>

        {activeMode === null && (<>
          <div>
            {/* Logo */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '2rem'
            }}>
              {['D', 'E', 'J', 'A'].map((letter, index) => (
                <span key={index} style={{
                  fontSize: '2.5rem'
                }}>
                  {letter}
                </span>
              ))}
            </div>
            {!showInfo ? (
              <>
                <div style={{marginBottom: '2rem'}}>
                  <Label style={{marginBottom: '0.5rem'}}>
                    FINE-TUNED AI ART MODELS
                  </Label>
                  {/* <Label style={{marginBottom: '2rem'}}>
                    DIRECTLY FROM ARTISTS
                  </Label>

                  <Label
                    onClick={() => setShowInfo(true)}
                    style={{
                      cursor: 'pointer',
                      opacity: 0.6,
                      marginBottom: '3rem'
                    }}
                  >
                    LEARN MORE
                  </Label> */}
                </div>
              </>
            ) : (
              <>
                <div style={{marginBottom: '2rem'}}>
                  <Text style={{marginBottom: '1.5rem', lineHeight: '1.5'}}>
                    Our platform allows artists to train custom fine-tuned AI models on their work.
                    <br /><br />
                    Artists can charge for the use of their models in exchange for consent to use the output.
                    <br /><br />
                    instagram ... @deja.artist
                  </Text>

                  <div
                    onClick={() => setShowInfo(false)}
                    style={{
                      cursor: 'pointer',
                      opacity: 0.6,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginBottom: '3rem'
                    }}
                  >
                    BACK
                  </div>
                </div>
              </>
            )}
          </div>
          <div>
            <Button
              primary
              skew
              style={{marginBottom: '1rem'}}
              onClick={() => setActiveMode('login')}
              label='LOG IN'
            />
            <Button
              skew
              onClick={() => setActiveMode('signUp')}
              label='REGISTER'
            />
          </div>
        </>)}
        {activeMode === 'login' && (
          <>
            <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch'}}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(email) => {
                  setEmail(email);
                }}
                required
                skew
                containerStyle={{
                  marginBottom: 2,
                }}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(password) => setPassword(password)}
                required
                skew
                containerStyle={{
                }}
              />
              <div style={{marginTop: '2rem', marginBottom: '1rem'}}>
                <Button
                  primary
                  skew
                  style={{marginBottom: 2, width: '100%'}}
                  onClick={() => handleLogin('LOGIN')}
                  label='LOG IN'
                />
              </div>

              <Button onClick={forgotPassword} style={{
                cursor: 'pointer',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }} skew label='Forgot Password' />

              <Button onClick={() => setActiveMode(null)} style={{
                cursor: 'pointer',
                textAlign: 'center',
                marginTop: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }} skew label='Back' />
            </div>
          </>
        )}

        {activeMode === 'signUp' && (
          <>
            <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch'}}>
              <Input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(firstName) => setFirstName(firstName)}
                required
                skew
                containerStyle={{
                  marginBottom: 2
                }}
              />
              <Input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(lastName) => setLastName(lastName)}
                required
                skew
                containerStyle={{
                  marginBottom: 2
                }}
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(email) => setEmail(email)}
                required
                skew
                containerStyle={{
                  marginBottom: 2
                }}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(password) => setPassword(password)}
                required
                skew
              />
              <div style={{marginTop: '2rem', textAlign: 'center'}}>
                <Checkbox
                  style={{borderRadius: 0}}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span>&nbsp; &nbsp;I agree to the <a target='_blank' href="/terms" style={{textDecoration: 'underline'}}>terms</a></span>
              </div>
              <div style={{marginTop: '2rem'}}>
                <Button
                  primary
                  skew
                  style={{marginBottom: '1rem', width: '100%'}}
                  onClick={() => handleLogin('SIGNUP')}
                  label='REGISTER'
                />
                <Button onClick={() => setActiveMode(null)} style={{
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  opacity: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }} skew label='Back' />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
