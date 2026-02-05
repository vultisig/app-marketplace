import { App } from "@/utils/types";

export const mockFAQs: Record<string, App["faqs"]> = {
  "vultisig-dca-0000": [
    {
      answer:
        "A recurring swap is a dollar-cost averaging (DCA) strategy in which you invest a fixed amount in an asset at regular intervals, regardless of the current price. With the Recurring Swaps App, this process is fully automated. You choose the assets, amounts, and time intervals in advance, and your purchases are executed automatically after setup. No manual input is needed, making the app well-suited for long-term investing or strategic on-chain executions.",
      question: "What are recurring swaps?",
    },
    {
      answer:
        "As with all Vultisig apps, you install the app and grant it permissions for specific DCA automations. Each automation is independent and will only execute trades according to the parameters you define (from asset, to asset, amount, and time interval). If you want to stop a DCA automation, you can simply delete it and no further trades will be executed.",
      question: "How does the Recurring Swaps App work?",
    },
    {
      answer:
        "You still bear the full market risk of the assets you choose to DCA into. Their value can go down as well as up, and you may lose some or all of the amount you invest. The DCA app only automates your recurring trades; it does not remove or reduce price risk. Also, Vultisig does not have a global overview of your strategies or timing, so you are responsible for reviewing and managing your DCA setups.",
      question:
        "What are the risks or what can I lose by using Reoccurring Swaps?",
    },
    {
      answer:
        "A fixed fee of $0.50 USDC per executed trade is charged and added to your account’s fee balance. As with all Vultisig apps, the Fee Management app will deduct the accumulated balance on the due date, which you can see in the Billing section of the plugin marketplace. There is no minimum DCA amount – you are free to DCA any amount you like.",
      question:
        "What fees apply, or minimum amounts apply when using the Reoccurring Swaps App?",
    },
  ],
  "vultisig-recurring-sends-0000": [
    {
      answer: `
        <p>Recurring sends let you automatically transfer crypto at regular intervals. You choose the asset, amount, recipient, and timing, and your vault handles the execution.</p>
      `,
      question: "What are recurring sends?",
    },
    {
      answer: `
        <p>You configure a recurring send with:</p>
        <ul>
          <li>Asset</li>
          <li>Amount</li>
          <li>Recipient address</li>
          <li>Frequency / interval</li>
        </ul>
        <p>Your devices approve the setup using multi-device MPC.</p>
        <p>After that, the vault executes each send automatically until the schedule is deleted.</p>
      `,
      question: "How does the Recurring Sends App work?",
    },
    {
      answer: `
        <p>Yes - every automation is secured by your device quorum.</p>
        <p>Vultisig never stores private keys, and no external service can initiate or alter your automations.</p>
      `,
      question: "Is it safe to automate sends?",
    },
    {
      answer: `
        <p>Common use cases include:</p>
        <ul>
          <li>Paying contributors or team members</li>
          <li>Automating savings across wallets</li>
          <li>Funding a cold wallet at intervals</li>
          <li>Sending weekly or monthly allowances</li>
          <li>Recurring donations or subscriptions</li>
          <li>Treasury operations</li>
        </ul>
      `,
      question: "What can I use recurring sends for?",
    },
  ],
};
