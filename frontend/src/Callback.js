import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

const Callback = () => {
    const { isLoading, isAuthenticated } = useAuth0();
    const navigate = useNavigate();

    useEffect(() => {
    if (!isLoading && isAuthenticated) {
        navigate("/vibe", { replace: true });
    }
    }, [isLoading, isAuthenticated, navigate]);

    return <p style={{ color: "#e2e8f0", fontSize: "16px" }}>Loading...</p>;
};

export default Callback;