import { App } from "antd";

/** Set once the user has acknowledged the Freestyle full-autonomy warning, so
 * the confirmation prompt only appears the first time they enter Freestyle. */
export const FREESTYLE_CONFIRMED_KEY = "supercoder.freestyleConfirmed";

type ModalApi = ReturnType<typeof App.useApp>["modal"];

/** Show the one-time full-autonomy warning before entering Freestyle.
 * Resolves true if the caller may proceed (the user already acknowledged it
 * earlier, or confirms now); false if they cancel. */
export function ensureFreestyleConfirmed(modal: ModalApi): Promise<boolean> {
  if (localStorage.getItem(FREESTYLE_CONFIRMED_KEY) === "1") return Promise.resolve(true);
  return new Promise((resolve) => {
    modal.confirm({
      title: "Enter Freestyle mode?",
      content:
        "Freestyle runs with full autonomy: every tool call — file edits, shell commands, git — is auto-approved without asking, and the iteration cap is raised. Only use it on a project where you're comfortable letting the agent run unattended.",
      okText: "Enter Freestyle",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () => {
        localStorage.setItem(FREESTYLE_CONFIRMED_KEY, "1");
        resolve(true);
      },
      onCancel: () => resolve(false),
    });
  });
}
