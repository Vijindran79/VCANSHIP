// payment.ts
import { State, setState, type Quote, type Address } from './state';
import { showToast, toggleLoading } from './ui';
import { mountService } from './router';
import { logShipment, functions } from './firebase';
// FIX: Removed unused v9 `httpsCallable` import as we are now using the v8 namespaced API.
// import { httpsCallable } from 'firebase/functions';


// Module-level variables for Stripe
declare global {
    interface Window { Stripe: any; }
}
let stripe: any = null;
let elements: any = null;
let cardElement: any = null;

// This key is publishable and safe to be exposed on the frontend.
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51Pbi57RxPl8AIz54N5k1d365mQEtLqigstn62BAbpuqXqI0B0g60bkc2y6w2wO2r67c5Chw6uDxtaQyvIxiqWvsd00OAKW4xH5';

/**
 * Loads the Stripe.js script dynamically.
 */
function loadStripeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.Stripe) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject('Failed to load Stripe.js');
        document.head.appendChild(script);
    });
}

/**
 * Renders the dynamic content of the payment summary card.
 */
function renderOrderSummary() {
    const summaryContainer = document.getElementById('payment-summary-items');
    const summaryTotalEl = document.getElementById('payment-summary-total');
    if (!summaryContainer || !summaryTotalEl || !State.paymentContext) return;

    const { quote, addons } = State.paymentContext;
    let total = quote.totalCost;

    let itemsHtml = `
        <div class="review-item">
            <span>${quote.carrierName} (${quote.carrierType})</span>
            <strong>${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</strong>
        </div>
    `;

    if (addons && addons.length > 0) {
        addons.forEach(addon => {
            itemsHtml += `
                <div class="review-item">
                    <span>${addon.name}</span>
                    <strong>${State.currentCurrency.symbol}${addon.cost.toFixed(2)}</strong>
                </div>
            `;
            total += addon.cost;
        });
    }
    
    summaryContainer.innerHTML = itemsHtml;
    summaryTotalEl.textContent = `${State.currentCurrency.symbol}${total.toFixed(2)}`;
}

/**
 * Sets up the Stripe Elements form when the payment page is mounted.
 */
async function mountPaymentForm() {
    if (!stripe || !State.paymentContext) {
        showToast('Payment cannot be initiated.', 'error');
        mountService('landing'); // Go back to safety
        return;
    }

    const { quote, addons, shipmentId } = State.paymentContext;
    let totalAmount = quote.totalCost + (addons?.reduce((sum, addon) => sum + addon.cost, 0) || 0);

    toggleLoading(true, 'Preparing secure payment...');

    try {
        // Create a Payment Intent on the server via Firebase Function
        // FIX: Switched to v8 namespaced syntax for calling a Firebase Function.
        const createPaymentIntent = functions.httpsCallable('create-payment-intent');
        const result = await createPaymentIntent({
            amount: Math.round(totalAmount * 100), // Stripe expects amount in cents
            currency: State.currentCurrency.code.toLowerCase(),
            description: `Vcanship Shipment ${shipmentId}`
        });

        const data: any = result.data;

        if (!data?.clientSecret) {
            throw new Error('Failed to create payment session.');
        }

        setState({ paymentClientSecret: data.clientSecret });

        // Create and mount the Stripe Elements
        elements = stripe.elements({ clientSecret: data.clientSecret });
        cardElement = elements.create('card', {
             style: {
                base: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                    fontFamily: '"Poppins", sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--medium-gray').trim(),
                    }
                },
                invalid: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim(),
                    iconColor: getComputedStyle(document.documentElement).getPropertyValue('--error-color').trim()
                }
            }
        });
        
        const cardElementContainer = document.getElementById('stripe-card-element');
        if (cardElementContainer) {
             cardElementContainer.innerHTML = ''; // Clear previous elements
             cardElement.mount(cardElementContainer);
        } else {
             throw new Error("Stripe container element not found.");
        }
       
    } catch (err: any) {
        console.error('Error mounting payment form:', err);
        showToast(err.message || 'Could not prepare payment form.', 'error');
        mountService(State.paymentContext.service || 'landing'); // Go back to the service page
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handles the submission of the payment form.
 */
async function handlePaymentSubmit(event: Event) {
    event.preventDefault();

    if (!stripe || !elements || !State.paymentClientSecret) {
        showToast('Payment system is not ready. Please wait.', 'error');
        return;
    }
    
    const submitButton = document.getElementById('payment-submit-btn') as HTMLButtonElement;
    const spinner = submitButton.querySelector('.loading-spinner-small') as HTMLElement;

    toggleLoading(true, 'Processing payment...');
    submitButton.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';

    try {
        const cardholderNameInput = document.getElementById('cardholder-name') as HTMLInputElement;
        const cardholderName = cardholderNameInput.value;
        
        if (!cardholderName) {
            showToast('Please enter the cardholder name.', 'error');
            throw new Error('Missing cardholder name');
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(State.paymentClientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: cardholderName,
                },
            },
        });

        if (error) {
            showToast(error.message || 'An error occurred during payment.', 'error');
            throw new Error(error.message);
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
            showToast('Payment successful!', 'success');
            
            if (State.paymentContext) {
                 const { quote, addons, shipmentId, origin, destination, service } = State.paymentContext;
                 const totalCost = quote.totalCost + (addons?.reduce((sum, addon) => sum + addon.cost, 0) || 0);

                 // Log shipment to Supabase DB (fire-and-forget)
                 logShipment({
                    service: service,
                    tracking_id: shipmentId,
                    origin: typeof origin === 'string' ? origin : origin.street,
                    destination: typeof destination === 'string' ? destination : destination.street,
                    cost: totalCost,
                    currency: State.currentCurrency.code,
                 });

                 // Store confirmation details for the service page to pick up
                 sessionStorage.setItem('vcanship_show_confirmation', JSON.stringify(State.paymentContext));
                 
                 // Navigate to the service's confirmation page
                 mountService(service);
            }
        } else {
             showToast('Payment did not succeed. Please try again.', 'warning');
        }

    } catch (err) {
        console.error('Payment submission failed:', err);
    } finally {
        toggleLoading(false);
        submitButton.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
}

/**
 * Initializes the payment page functionality.
 */
export async function initializePaymentPage() {
    try {
        await loadStripeScript();
        stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    } catch (error) {
        console.error(error);
        showToast('Could not load payment provider. Please refresh.', 'error');
        return;
    }

    const paymentPage = document.getElementById('page-payment');
    if (paymentPage) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class' && (mutation.target as HTMLElement).classList.contains('active')) {
                    if (State.paymentContext) {
                        renderOrderSummary();
                        mountPaymentForm();
                    } else {
                        showToast('No payment information found. Redirecting...', 'error');
                        mountService('landing');
                    }
                }
            }
        });
        observer.observe(paymentPage, { attributes: true });
    }
    
    const form = document.getElementById('payment-form');
    form?.addEventListener('submit', handlePaymentSubmit);
}
