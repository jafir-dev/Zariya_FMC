import Stripe from 'stripe';
import { db } from './db';
import { subscriptionTiers, userSubscriptions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const stripeService = {
  // Create a customer
  createCustomer: async (email: string, name: string) => {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return { customer, error: null };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return { customer: null, error };
    }
  },

  // Create a subscription
  createSubscription: async (customerId: string, priceId: string) => {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
      return { subscription, error: null };
    } catch (error) {
      console.error('Error creating Stripe subscription:', error);
      return { subscription: null, error };
    }
  },

  // Create a checkout session
  createCheckoutSession: async (customerId: string, priceId: string, successUrl: string, cancelUrl: string) => {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return { session, error: null };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return { session: null, error };
    }
  },

  // Handle webhook events
  handleWebhook: async (event: Stripe.Event) => {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      return { success: true, error: null };
    } catch (error) {
      console.error('Error handling webhook:', error);
      return { success: false, error };
    }
  },

  // Get subscription details
  getSubscription: async (subscriptionId: string) => {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return { subscription, error: null };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return { subscription: null, error };
    }
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string) => {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return { subscription, error: null };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { subscription: null, error };
    }
  },

  // Create a product and price
  createProductAndPrice: async (tierData: any) => {
    try {
      // Create product
      const product = await stripe.products.create({
        name: tierData.name,
        description: tierData.description,
      });

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(tierData.price * 100), // Convert to cents
        currency: tierData.currency.toLowerCase(),
        recurring: {
          interval: tierData.billingCycle === 'yearly' ? 'year' : 'month',
        },
      });

      return { product, price, error: null };
    } catch (error) {
      console.error('Error creating product and price:', error);
      return { product: null, price: null, error };
    }
  },
};

// Webhook handlers
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    // Update user subscription in database
    await db.update(userSubscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await db.update(userSubscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await db.update(userSubscriptions)
      .set({
        status: 'canceled',
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      await db.update(userSubscriptions)
        .set({
          status: 'active',
        })
        .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string));
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      await db.update(userSubscriptions)
        .set({
          status: 'past_due',
        })
        .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string));
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

export default stripeService;
