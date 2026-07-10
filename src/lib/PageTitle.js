export default function PageTitle({ children }) {
    return (
        <div style={{ textAlign: "center", padding: "28px 24px 8px 24px" }}>
            <h1 style={{ margin: 0, fontSize: 26 }}>{children}</h1>
        </div>
    );
}