import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import iceCreamIcon from '../assets/logo.png';
import './SignUpCard.css';
import { API_VERSION_URL } from '../config';

const SignUpCard = () => {
    const [fname, setFname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");

    const navigate = useNavigate();

    const handleGoogleLogin = () => {
        window.location.href = `${API_VERSION_URL}/auth/google`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fname || !email || !password) {
            setPopupMessage("Please fill in all required fields.");
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: fname,
                email,
                password
            };

            const response = await fetch(`${API_VERSION_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                setFname("");
                setEmail("");
                setPassword("");

                setPopupMessage("✅ Signed up successfully!");
                setShowPopup(true);
                setTimeout(() => {
                    setShowPopup(false);
                    navigate('/login');
                }, 1500);
            } else {
                throw new Error(responseData.message || 'Signup failed');
            }
        } catch (error) {
            console.error("Signup error:", error);
            setPopupMessage(`❌ ${error.message}`);
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="body">
            <div className="container">
                <form className="signup-form" onSubmit={handleSubmit}>
                    <img src={iceCreamIcon} alt="Frozen Feast" className="logo" />
                    <h2>Create your account</h2>

                    <input
                        type="text"
                        value={fname}
                        placeholder="Full Name"
                        onChange={(e) => setFname(e.target.value)}
                        required
                        disabled={loading}
                    />
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />
                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading}
                        />
                        <span
                            className="toggle-password"
                            onClick={() => !loading && setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            title={showPassword ? "Hide Password" : "Show Password"}
                            style={{ opacity: loading ? 0.5 : 1 }}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </span>
                    </div>

                    <button type="submit" className="signup-btn" disabled={loading} style={{ marginTop: "15px" }}>
                        {loading ? "Signing up..." : "Create Account"}
                    </button>

                    <p className="signup">
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                    <p>-----------------------   OR   ----------------------- </p>

                    <button
                        type="button"
                        className="continue-google-btn"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                        </svg>
                        Continue with Google
                    </button>
                </form>

                {showPopup && (
                    <div className={`popup ${popupMessage.includes('❌') ? 'error' : 'success'}`}>
                        {popupMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignUpCard;
