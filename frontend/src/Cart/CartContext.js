// CartContext.js
import React, {
  createContext, useContext, useState, useEffect, useCallback,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";
import API_BASE_URL from './api';

const CartContext = createContext();
const API = `${API_BASE_URL}/api/cart`;

export const CartProvider = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [cart, setCart]       = useState({ items: [], total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(async () => {
    const token = await getAccessTokenSilently({
      authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
    });
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, [getAccessTokenSilently]);

  // Load cart from DB on login
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        setLoading(true);
        const headers = await getHeaders();
        const res  = await fetch(API, { headers });
        const data = await res.json();
        setCart(data.items ? data : { items: [], total: 0, itemCount: 0 });
      } catch (err) {
        console.error("Failed to load cart:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, getHeaders]);

  const addToCart = async (item, vendorId, vendorName) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API}/items`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          menuItem:   item._id,
          name:       item.name,
          price:      item.price,
          quantity:   1,
          vendor:     vendorId,
          vendorName,
          imageUrl:   item.imageUrl || "",
        }),
      });
      const data = await res.json();
      if (data.items) setCart(data);
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API}/items/${itemId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (data.items) setCart(data);
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${API}/items/${itemId}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (data.items) setCart(data);
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };

  const clearCart = async () => {
    try {
      const headers = await getHeaders();
      await fetch(API, { method: "DELETE", headers });
      setCart({ items: [], total: 0, itemCount: 0 });
    } catch (err) {
      console.error("Failed to clear cart:", err);
    }
  };

  // Groups items by vendor — used in Student.js cart view
  const getCartByVendor = () => {
    const map = {};
    (cart.items || []).forEach((item) => {
      const vid = item.vendor?._id || item.vendor;
      if (!map[vid]) {
        map[vid] = {
          vendorId:   vid,
          vendorName: item.vendorName,
          items:      [],
          subtotal:   0,
        };
      }
      map[vid].items.push(item);
      map[vid].subtotal += item.price * item.quantity;
    });
    return Object.values(map);
  };

  return (
    <CartContext.Provider value={{
      cartItems:      cart.items,
      cartTotal:      cart.total,
      cartCount:      cart.itemCount,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      getCartByVendor,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);

// Inlined here so AddToCart.js can be deleted
export const AddToCartButton = ({ item, vendorId, vendorName, className, disabled, label }) => {
  const { addToCart } = useCart();
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={() => addToCart(item, vendorId, vendorName)}
    >
      {label || "Add to Cart"}
    </button>
  );
};