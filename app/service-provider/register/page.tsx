import React from 'react';

const ServiceProviderRegisterPage: React.FC = () => {
  return (
    <div className="service-provider-register-page">
      <header className="service-page-header" style={{ marginBottom: '1.5rem' }}>
        <h2>Register as a Service Provider</h2>
        <p className="subtitle">
          Share your logistics capabilities to receive qualified shipment requests from Vcanship users.
        </p>
      </header>

      <div className="form-container">
        <form
          className="card"
          style={{ padding: '1.5rem', maxWidth: '640px', margin: '0 auto' }}
          onSubmit={(e) => {
            e.preventDefault();
            alert('This is a demo form. Connect it to your backend to store provider profiles.');
          }}
        >
          <div className="input-wrapper">
            <label htmlFor="sp-name">Company / Trading Name</label>
            <input id="sp-name" type="text" required placeholder="e.g., OceanStar Logistics Ltd." />
          </div>

          <div className="input-wrapper">
            <label htmlFor="sp-email">Contact Email</label>
            <input id="sp-email" type="email" required placeholder="you@example.com" />
          </div>

          <div className="input-wrapper">
            <label htmlFor="sp-phone">Contact Phone</label>
            <input id="sp-phone" type="tel" placeholder="+44 20 1234 5678" />
          </div>

          <div className="input-wrapper">
            <label htmlFor="sp-services">Services Offered</label>
            <textarea
              id="sp-services"
              rows={3}
              placeholder="e.g., FCL/FCL sea freight, UK domestic parcels, warehousing, customs clearance..."
            />
          </div>

          <div className="input-wrapper">
            <label htmlFor="sp-regions">Primary Trade Lanes / Regions</label>
            <input
              id="sp-regions"
              type="text"
              placeholder="e.g., China → UK, EU → UK, Intra-UK domestic"
            />
          </div>

          <div className="checkbox-wrapper" style={{ marginTop: '1rem' }}>
            <input id="sp-terms" type="checkbox" required />
            <label htmlFor="sp-terms">
              I confirm that I am authorised to represent this company and agree to be contacted about
              partnership opportunities.
            </label>
          </div>

          <div className="form-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button type="submit" className="main-submit-btn">
              Submit Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceProviderRegisterPage;



