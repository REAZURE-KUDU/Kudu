//VendorReview.js
import React, { useState, useEffect } from "react";
import "./VendorReviews.css";
import API_BASE_URL from './api';

const VendorReviews = ({ vendorId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reviews/vendor/${vendorId}`)
      .then((res) => res.json())
      .then((data) => { setReviews(Array.isArray(data) ? data : []); })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [vendorId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading)
    return React.createElement("p", { className: "reviews-loading" }, "Loading reviews...");

  return React.createElement("div", { className: "vendor-reviews" },
    React.createElement("h3", null, "Customer Reviews"),

    // UAT 5 — empty state
    reviews.length === 0
      ? React.createElement("p", { className: "reviews-empty" },
          "This vendor hasn't received any reviews yet."
        )
      : React.createElement(React.Fragment, null,

          React.createElement("div", { className: "reviews-summary" },
            React.createElement("span", { className: "reviews-avg-star" }, "★"),
            React.createElement("span", { className: "reviews-avg-score" }, avgRating),
            React.createElement("span", { className: "reviews-count" },
              `(${reviews.length} review${reviews.length !== 1 ? "s" : ""})`
            )
          ),

          React.createElement("div", { className: "reviews-list" },
            reviews.map((r) =>
              React.createElement("div", { key: r._id, className: "review-card" },
                React.createElement("div", { className: "review-header" },
                  React.createElement("span", { className: "review-author" },
                    r.student ? `${r.student.firstName} ${r.student.lastName}`.trim() : "Student"
                  ),
                  React.createElement("span", { className: "review-stars" },
                    [1,2,3,4,5].map((s) =>
                      React.createElement("span", {
                        key: s,
                        className: `star${s <= r.rating ? " filled" : ""}`,
                      }, "★")
                    )
                  ),
                  React.createElement("span", { className: "review-date" },
                    new Date(r.createdAt).toLocaleDateString()
                  )
                ),
                r.comment && React.createElement("p", { className: "review-comment" }, r.comment)
              )
            )
          )
        )
  );
};

export default VendorReviews;