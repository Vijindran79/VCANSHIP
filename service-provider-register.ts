// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
// FIX: This file has been refactored to use React to render the Service Provider Registration form,
// replacing the previous vanilla JS implementation for a more robust and modern UI.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { setState } from './state';
import { switchPage } from './ui';
import ServiceProviderRegisterPage from './app/service-provider/register/page.tsx';

let reactRoot: ReactDOM.Root | null = null;

export function startServiceProviderRegister() {
    setState({ currentService: 'service-provider-register' });
    switchPage('service-provider-register');

    const container = document.getElementById('page-service-provider-register');
    if (container) {
        // Clear any previous vanilla JS content
        container.innerHTML = '';
        
        // Create a root and render the React component.
        // This leverages the React libraries available via the importmap.
        if (!reactRoot) {
            reactRoot = ReactDOM.createRoot(container);
        }
        reactRoot.render(React.createElement(ServiceProviderRegisterPage));
    } else {
        console.error("Could not find container for Service Provider registration page.");
    }
}

// Optional: Add a cleanup function if navigating away, though switchPage handles display none
export function unmountServiceProviderRegister() {
    if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
    }
}
