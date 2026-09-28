import { useState } from "react";
import './AddProducts.css';
import { API_VERSION_URL } from '../config';

import { useAuth } from '../context/AuthContext';

const AddProduct = () => {
    const { user } = useAuth();
    const [productData, setProductData] = useState({
        iceName: "",
        description: "",
        tags: "",
        price:""
    });
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");

    const navigate = useNavigate();

    const changeHandler = (e) => {
        const { name, value } = e.target;
        setProductData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        setImageFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!productData.iceName || !productData.description || !productData.tags || !imageFile) {
            setPopupMessage("Please fill in all required fields, including image.");
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
            return;
        }

        setLoading(true);
        try {
            if (!user) {
                throw new Error("Please log in as admin to add products.");
            }

            const formData = new FormData();
            formData.append('iceName', productData.iceName); // FIXED
            formData.append('description', productData.description);
            formData.append('tags', productData.tags);
            formData.append('price', productData.price);
            formData.append('imageFile', imageFile);

            const response = await fetch(`${API_VERSION_URL}/imageUpload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                setProductData({ iceName: "", description: "", tags: "", price: "" });
                setImageFile(null);
                setPopupMessage("✅ Product added successfully!");
                setShowPopup(true);
                setTimeout(() => {
                    setShowPopup(false);
                }, 2000);
            } else {
                throw new Error(responseData.message || 'Product addition failed');
            }
        } catch (error) {
            console.error("Add product error:", error);
            setPopupMessage(`❌ ${error.message}`);
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-product-container">
            <div className="ribbon-container">
                <div className="ribbon">
                    <span className="ribbon-text">Add Product</span>
                </div>
                <div className="subtitle">
                    <p>Enter Product Details</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="add-product-form">
                <div className="form-group">
                    <label htmlFor="iceName">Product name</label>
                    <input
                        type="text"
                        placeholder="Enter product name"
                        name="iceName"          // FIXED
                        id="iceName"
                        value={productData.iceName}
                        onChange={changeHandler}
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description</label>
                    <textarea
                        placeholder="Enter product description"
                        name="description"
                        id="description"
                        value={productData.description}
                        onChange={changeHandler}
                        required
                        rows={4}
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="tags">Tags</label>
                    <select
                        name="tags"
                        id="tags"
                        value={productData.tags}
                        onChange={changeHandler}
                        required
                        disabled={loading}
                    >
                        <option value="">Select Tags</option>
                        <option value="Regular">Regular</option>
                        <option value="Gelato">Gelato</option>
                        <option value="Sorbet">Sorbet</option>
                        <option value="Frozen Yogurt">Frozen Yogurt</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="price">Price</label>
                    <input
                        placeholder="amount"
                        type="text"
                        name="price"
                        id="price"
                        value={productData.price}
                        onChange={changeHandler}
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="image">Product Image</label>
                    <input
                        type="file"
                        accept="image/*"
                        id="image"
                        onChange={handleImageChange}
                        required
                        disabled={loading}
                    />
                    {imageFile && <p className="file-preview">Selected: {imageFile.name}</p>}
                </div>

                <div className="form-actions"> {/* FIXED */}
                    <button type="submit" disabled={loading}>
                        {loading ? "Adding Product..." : "Add Product"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setProductData({ iceName: "", description: "", tags: "", price: "" });
                            setImageFile(null);
                        }}
                        disabled={loading}
                    >
                        Clear
                    </button>
                </div>
            </form>

            {showPopup && (
                <div className={`popup ${popupMessage.includes('❌') ? 'error' : 'success'}`}> {/* FIXED */}
                    {popupMessage}
                </div>
            )}
        </div>
    );
};

export default AddProduct;
