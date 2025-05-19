const express = require('express');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(express.json());

/**
 * Endpoint to update stopDate for all active customers.
 */
app.post('/updateStopDates', async (req, res) => {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (dayOfMonth > (daysInMonth - 5)) {
    const activeCustomersRef = db.collection('customers').where('isActive', '==', true);
    const snapshot = await activeCustomersRef.get();

    const updatePromises = snapshot.docs.map(async doc => {
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      await doc.ref.update({ stopDate: nextMonth });
      console.log(`Updated stopDate for customer: ${doc.id} to ${nextMonth}`);
    });

    await Promise.all(updatePromises);
    console.log("Stop dates updated successfully for all active customers.");
    res.status(200).send("Stop dates updated successfully.");
  } else {
    console.log(`Not in the last 5 days of the month (${dayOfMonth} of ${daysInMonth}). Skipping update.`);
    res.status(200).send("Skipping stop date update.");
  }
});

/**
 * Endpoint to create data for the next month for all active customers.
 */
app.post('/createNextMonthData', async (req, res) => {
  const now = new Date();
  const dayOfMonth = now.getDate();

  if (dayOfMonth === 1) {
    const activeCustomersRef = db.collection('customers').where('isActive', '==', true);
    const snapshot = await activeCustomersRef.get();

    const creationPromises = snapshot.docs.map(async doc => {
      const customerData = doc.data();
      const customerId = doc.id;
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);

      const monthlyDataRef = db.collection(`customers/${customerId}/monthly_data`);
      await monthlyDataRef.add({
        monthStartDate: nextMonth,
        milkQuantity: customerData.defaultMilkQuantity || 0,
        paymentStatus: 'pending',
        createdAt: now,
      });
      console.log(`Created next month data for customer: ${customerId} for ${nextMonth}`);
    });

    await Promise.all(creationPromises);
    console.log("Next month's data creation completed for all active customers.");
    res.status(200).send("Next month's data creation completed.");
  } else {
    console.log(`Not the first day of the month (${dayOfMonth}). Skipping data creation.`);
    res.status(200).send("Skipping next month data creation.");
  }
});

// Export the Express app for Vercel
module.exports = app;