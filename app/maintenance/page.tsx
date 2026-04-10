export default function MaintenancePage() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#fafaf8',
          color: '#1a1a1a',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Service unavailable — configuration error
          </h1>
          <p style={{ fontSize: '1rem', color: '#555' }}>
            บริการไม่พร้อมใช้งาน — ข้อผิดพลาดในการกำหนดค่า
          </p>
        </div>
      </body>
    </html>
  );
}
