import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Adscend Media S2S Postback Handler
 * Receives notifications when a user completes an offer.
 * 
 * Configured in Adscend Dashboard as:
 * https://{region}-{project}.cloudfunctions.net/adscendPostback?txn_id={txn_id}&subid1={subid1}&payout={payout}&offer_name={offer_name}
 */
export const adscendPostback = functions.https.onRequest(async (req, res) => {
    // 1. Basic Parameter Check
    const { txn_id, subid1, payout, offer_name } = req.query;

    if (!txn_id || !subid1) {
        console.error('[Adscend Postback] Missing required parameters');
        res.status(400).send('Missing parameters');
        return;
    }

    const userId = subid1 as string;
    const transactionId = txn_id as string;
    const payoutAmount = parseFloat(payout as string) || 0;
    const offerName = (offer_name as string) || 'Unknown Offer';

    try {
        // 2. Prevent Duplicates (Check if txn_id already processed)
        const rewardRef = admin.firestore().collection('adRewards').doc(transactionId);
        const existing = await rewardRef.get();

        if (existing.exists) {
            console.log(`[Adscend Postback] Duplicate transaction: ${transactionId}`);
            res.status(200).send('OK (Duplicate)');
            return;
        }

        // 3. Record the Reward in Firestore
        await rewardRef.set({
            userId,
            transactionId,
            payout: payoutAmount,
            offerName,
            type: 'offerwall',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            claimedAt: null, // Will be updated by client when heart is granted
        });

        console.log(`[Adscend Postback] Reward recorded for user ${userId}: ${offerName} ($${payoutAmount})`);
        res.status(200).send('OK');
    } catch (error) {
        console.error('[Adscend Postback] Firestore Error:', error);
        res.status(500).send('Internal Server Error');
    }
});
