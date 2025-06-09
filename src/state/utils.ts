export function getTimeAgo(date: Date | string | number) {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds} secs ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
}

export async function copyToClipboard(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error("Failed to copy text: ", err);
    }
}

export const formatVerifierName = (verifier: string): string => {
  if (verifier.startsWith("risc0")) {
    return "RISC Zero v2";
  } else if (verifier.startsWith("sp1")) {
    return "SP1 v5";
  } else if (verifier.startsWith("noir")) {
    return "Noir";
  } else {
    return verifier;
  }
};
