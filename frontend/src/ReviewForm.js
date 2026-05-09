//ReviewForm.js
import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./ReviewForm.css";

const ReviewForm = ({ order, onReviewSubmitted }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [rating,          setRating]          = useState(0);
  const [hovered,         setHovered]         = useState(0);
  const [comment,         setComment]         = useState("");
  const [submitted,       setSubmitted]       = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
        });
        const res = await fetch(`/api/reviews/order/${order._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data) setAlreadyReviewed(true);
      } catch { /* ignore */ }
    };
    check();
  }, [order._id, getAccessTokenSilently]);

  // UAT 2 — non-collected orders
  if (order.status !== "collected")
    return React.createElement("p", { className: "review-unavailable" },
      "Reviews can only be submitted once your order has been collected."
    );

  // UAT 3 — already reviewed
  if (alreadyReviewed || submitted)
    return React.createElement("p", { className: "review-done" },
      "✅ You have already reviewed this order."
    );

  const handleSubmit = async () => {
    if (rating === 0) return setError("Please select a star rating.");
    setLoading(true);
    setError("");
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: process.env.REACT_APP_AUTH0_AUDIENCE },
      });
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order._id, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubmitted(true);
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return React.createElement("div", { className: "review-form" },
    React.createElement("h4", null, "Leave a Review"),

    React.createElement("div", { className: "star-row" },
      [1, 2, 3, 4, 5].map((star) =>
        React.createElement("span", {
          key: star,
          className: `star ${star <= (hovered || rating) ? "filled" : ""}`,
          onClick:      () => setRating(star),
          onMouseEnter: () => setHovered(star),
          onMouseLeave: () => setHovered(0),
        }, "★")
      )
    ),

    React.createElement("textarea", {
      placeholder:  "Optional comment (max 500 characters)",
      maxLength:    500,
      value:        comment,
      onChange:     (e) => setComment(e.target.value),
    }),

    error && React.createElement("p", { className: "review-error" }, error),

    React.createElement("button", {
      onClick:  handleSubmit,
      disabled: loading,
    }, loading ? "Submitting..." : "Submit Review")
  );
};

export default ReviewForm;