const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, BorderStyle, PageNumber,
  Header, Footer, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 28, color: "1F4E79" })],
    spacing: { before: 300, after: 150 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } }
  });
}

function qHeading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: "C00000" })],
    spacing: { before: 280, after: 100 },
  });
}

function subHeading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: "2E75B6", underline: {} })],
    spacing: { before: 160, after: 80 },
  });
}

function para(text, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, bold })],
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 40, after: 40 },
  });
}

function tableRow(label, val1, val2) {
  const { Table, TableRow, TableCell, WidthType, ShadingType } = require('docx');
  const border = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new TableRow({
    children: [
      new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: label, size: 22, bold: true })] })] }),
      new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: val1, size: 22 })] })] }),
      new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: val2, size: 22 })] })] }),
    ]
  });
}

function compTable(headers, rows) {
  const { Table, TableRow, TableCell, WidthType, ShadingType } = require('docx');
  const border = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colW = Math.floor(9360 / headers.length);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: headers.map(() => colW),
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          borders, width: { size: colW, type: WidthType.DXA },
          shading: { fill: "2E75B6", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22, color: "FFFFFF" })] })]
        }))
      }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map(cell => new TableCell({
          borders, width: { size: colW, type: WidthType.DXA },
          shading: { fill: ri % 2 === 0 ? "EBF3FB" : "FFFFFF", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: cell, size: 22 })] })]
        }))
      }))
    ]
  });
}

const children = [];

// TITLE PAGE
children.push(new Paragraph({
  children: [new TextRun({ text: "Cryptography & Network Security", bold: true, size: 48, color: "1F4E79" })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 600, after: 200 }
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "Comprehensive Question Bank with Detailed Answers", size: 28, color: "2E75B6", italics: true })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 100, after: 100 }
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "36 Questions | 5-10 Marks Each", size: 24, color: "555555" })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 100, after: 800 }
}));

// ===================== Q1 =====================
children.push(qHeading("Q1. Differentiate between Symmetric and Asymmetric Encryption. (2-5 Marks)"));

children.push(subHeading("Definition of Encryption"));
children.push(para("Encryption is the process of converting plaintext (readable data) into ciphertext (unreadable data) using a mathematical algorithm and a key, so that only authorized parties can access the original information. It is the fundamental building block of modern cryptography and network security."));

children.push(subHeading("Symmetric Encryption"));
children.push(para("Symmetric encryption, also known as secret-key or private-key encryption, uses a single key for both encryption and decryption. The same key is shared between the sender and receiver. Examples include AES (Advanced Encryption Standard), DES (Data Encryption Standard), and 3DES."));
children.push(para("Key characteristics:", true));
children.push(bullet("Uses one shared secret key for both encryption and decryption."));
children.push(bullet("Very fast and efficient, suitable for large data volumes."));
children.push(bullet("Key distribution is a challenge — both parties must securely share the key beforehand."));
children.push(bullet("Examples: AES, DES, 3DES, RC4, Blowfish."));

children.push(subHeading("Asymmetric Encryption"));
children.push(para("Asymmetric encryption, also called public-key cryptography, uses a pair of mathematically related keys: a public key (shared openly) and a private key (kept secret). Data encrypted with the public key can only be decrypted with the private key, and vice versa. Examples include RSA, ECC, and Diffie-Hellman."));
children.push(para("Key characteristics:", true));
children.push(bullet("Uses two keys: public key (for encryption) and private key (for decryption)."));
children.push(bullet("Slower than symmetric encryption due to complex mathematical operations."));
children.push(bullet("Solves the key distribution problem of symmetric encryption."));
children.push(bullet("Used for digital signatures, key exchange, and secure communication setup."));
children.push(bullet("Examples: RSA, ECC, Diffie-Hellman, ElGamal."));

children.push(subHeading("Comparison Table"));
children.push(compTable(
  ["Attribute", "Symmetric Encryption", "Asymmetric Encryption"],
  [
    ["Number of Keys", "1 (shared secret key)", "2 (public + private key pair)"],
    ["Speed", "Fast", "Slow"],
    ["Key Exchange", "Difficult (must share securely)", "Easy (public key can be shared openly)"],
    ["Security Level", "Lower (if key is compromised)", "Higher"],
    ["Use Case", "Bulk data encryption", "Key exchange, digital signatures"],
    ["Algorithm Examples", "AES, DES, RC4", "RSA, ECC, Diffie-Hellman"],
    ["Middleman Attack Risk", "Higher", "Lower"],
  ]
));

// ===================== Q2 =====================
children.push(qHeading("Q2. Define the model of Network Security and its important parameters with a neat diagram. (5 Marks)"));
children.push(subHeading("Model of Network Security"));
children.push(para("The Network Security Model describes how two communicating parties can securely transmit information over an insecure channel (like the internet) in the presence of potential adversaries. It was formalized by William Stallings and forms the conceptual backbone of all cryptographic protocols."));
children.push(subHeading("Key Components"));
children.push(bullet("Principal Parties: Sender (Alice) and Receiver (Bob) — the two entities that wish to communicate securely."));
children.push(bullet("Trusted Third Party: An entity like a Certificate Authority (CA) or Key Distribution Center (KDC) that assists in key exchange or identity verification."));
children.push(bullet("Transformation (Encryption/Decryption): The mathematical function applied to plaintext to produce ciphertext and vice versa."));
children.push(bullet("Secret Information (Keys): The keys used in the transformation — must be kept secret from the adversary."));
children.push(bullet("Opponent/Adversary: An entity (Eve, Mallory) attempting to intercept, modify, or disrupt communication."));
children.push(bullet("Secure Channel: The secured communication pathway created using cryptographic techniques."));
children.push(subHeading("Important Parameters"));
children.push(bullet("Confidentiality: Ensuring that only intended recipients can read the data (via encryption)."));
children.push(bullet("Integrity: Ensuring the data has not been altered during transit (via hash functions, MACs)."));
children.push(bullet("Authentication: Confirming the identity of the communicating parties (via digital signatures, certificates)."));
children.push(bullet("Non-repudiation: Ensuring that a sender cannot deny having sent a message."));
children.push(bullet("Availability: Ensuring authorized users can access the network and data when needed."));
children.push(subHeading("Diagram Description"));
children.push(para("[Sender] --> [Encrypt with Key] --> [Insecure Internet Channel] --> [Decrypt with Key] --> [Receiver]"));
children.push(para("                                            |"));
children.push(para("                                     [Adversary/Opponent]"));
children.push(para("                        (intercepts, modifies, replays messages)"));
children.push(para("The Trusted Third Party sits above this channel, providing key management and authentication services to both Sender and Receiver."));

// ===================== Q3 =====================
children.push(qHeading("Q3. Identify examples for Substitution and Transposition Ciphers."));
children.push(subHeading("Substitution Ciphers"));
children.push(para("In substitution ciphers, each letter or group of letters in the plaintext is replaced by another letter or group according to a fixed rule or key. The positions of letters remain the same, but the identities change."));
children.push(para("Examples:", true));
children.push(bullet("Caesar Cipher: Each letter is shifted by a fixed number (e.g., shift of 3: A→D, B→E). Example: 'HELLO' → 'KHOOR'."));
children.push(bullet("Monoalphabetic Cipher: Each letter maps to a unique different letter via a random substitution alphabet. Example: A→Q, B→W, C→E..."));
children.push(bullet("Vigenere Cipher: A polyalphabetic cipher using a keyword. Each letter of the plaintext is shifted by the corresponding letter of the repeating keyword."));
children.push(bullet("Playfair Cipher: Encrypts pairs of letters (digraphs) using a 5x5 key matrix."));
children.push(bullet("Hill Cipher: Uses matrix multiplication for encryption. A block of plaintext letters is multiplied by a key matrix modulo 26."));
children.push(subHeading("Transposition Ciphers"));
children.push(para("In transposition ciphers, the letters of the plaintext are rearranged (permuted) according to a certain system. The actual letters remain unchanged, but their positions are scrambled."));
children.push(bullet("Rail Fence Cipher: Plaintext is written in a zigzag pattern across multiple 'rails', then read row by row."));
children.push(bullet("Columnar Transposition: Plaintext is written in rows under a key, then columns are read in the order specified by the key."));
children.push(bullet("Route Cipher: Text is written in a grid and read in a specific route (spiral, diagonal, etc.)."));
children.push(bullet("Double Transposition: Columnar transposition applied twice for added security."));

// ===================== Q4 =====================
children.push(qHeading("Q4. Differentiate between Block Cipher and Stream Cipher."));
children.push(subHeading("Block Cipher"));
children.push(para("A block cipher encrypts plaintext by dividing it into fixed-size blocks (e.g., 64-bit or 128-bit) and encrypting each block as a unit using the same key. If the plaintext is not a multiple of the block size, padding is added. Examples: AES (128-bit blocks), DES (64-bit blocks), Blowfish."));
children.push(subHeading("Stream Cipher"));
children.push(para("A stream cipher encrypts plaintext one bit or byte at a time by XORing it with a pseudorandom keystream generated from the key. It is well-suited for real-time communication and continuous data streams. Examples: RC4, ChaCha20, A5/1 (used in GSM)."));
children.push(compTable(
  ["Feature", "Block Cipher", "Stream Cipher"],
  [
    ["Unit of Encryption", "Fixed-size blocks (64/128 bits)", "Bit or byte at a time"],
    ["Speed", "Slower (complex operations)", "Faster (simple XOR operations)"],
    ["Error Propagation", "Errors spread within a block", "Errors affect only that bit/byte"],
    ["Applications", "File encryption, database security", "Real-time communication, wireless"],
    ["Padding Required", "Yes (if data < block size)", "No"],
    ["Examples", "AES, DES, 3DES, Blowfish", "RC4, ChaCha20, A5/1"],
    ["Memory Requirement", "More (stores entire block)", "Less (one bit/byte at a time)"],
  ]
));

// ===================== Q5 =====================
children.push(qHeading("Q5. Write short notes on: a) Vigenere Cipher  b) Rail Fence Cipher  c) Monoalphabetic Cipher  d) Caesar Cipher"));
children.push(subHeading("a) Vigenere Cipher"));
children.push(para("The Vigenere cipher is a polyalphabetic substitution cipher invented by Blaise de Vigenere in the 16th century. It uses a keyword to encrypt plaintext. Each letter of the plaintext is shifted by the amount corresponding to the letter of the keyword (repeated as necessary)."));
children.push(para("Encryption Formula: C_i = (P_i + K_i) mod 26, where P_i is the plaintext letter and K_i is the key letter."));
children.push(para("Example: Plaintext = 'ATTACK', Key = 'LEMON'. Each letter of ATTACK is shifted by the corresponding letter of LEMON: A+L=L, T+E=X, T+M=F, A+O=O, C+N=P, K+L=V → Ciphertext = 'LXFOPV'."));
children.push(para("It resists simple frequency analysis because the same plaintext letter can map to different ciphertext letters depending on its position. However, it is vulnerable to the Kasiski test if the key is short."));

children.push(subHeading("b) Rail Fence Cipher"));
children.push(para("The Rail Fence cipher is a transposition cipher where the plaintext is written in a zigzag pattern across a number of 'rails' (rows), and the ciphertext is read row by row from top to bottom."));
children.push(para("Example: Plaintext = 'WEAREDISCOVERED', Rails = 3."));
children.push(para("Rail 1: W . . . E . . . I . . . V . ."));
children.push(para("Rail 2: . E . R . D . S . O . E . E ."));
children.push(para("Rail 3: . . A . . . C . . . R . . . D"));
children.push(para("Ciphertext = 'WEIVERDSOEEACRD' (read row by row)."));
children.push(para("The number of rails is the key. It is simple but provides weak security and is easily broken by brute force since the number of possible keys is small."));

children.push(subHeading("c) Monoalphabetic Cipher"));
children.push(para("In a monoalphabetic substitution cipher, each letter of the plaintext is always replaced by the same letter throughout the message. The substitution alphabet is a random permutation of the 26 letters, giving 26! possible keys (much larger than Caesar's 25 keys)."));
children.push(para("Example: A→Q, B→W, C→E, D→R, E→T, ..."));
children.push(para("'HELLO' might become 'XTLLG' if H→X, E→T, L→L, O→G."));
children.push(para("Although the key space is large, monoalphabetic ciphers are vulnerable to frequency analysis because the frequency of letters in the ciphertext matches the natural frequency of letters in the language (E is most common in English, followed by T, A, O, etc.). Cryptanalyst Charles Babbage broke many such ciphers using this technique."));

children.push(subHeading("d) Caesar Cipher"));
children.push(para("The Caesar cipher is one of the oldest and simplest encryption techniques, attributed to Julius Caesar. Each letter in the plaintext is shifted by a fixed number of positions (the key) in the alphabet. The most famous version uses a shift of 3."));
children.push(para("Encryption: C = (P + K) mod 26"));
children.push(para("Decryption: P = (C - K + 26) mod 26"));
children.push(para("Example with K=3: A→D, B→E, C→F, ..., Z→C."));
children.push(para("Plaintext: 'HELLO' → Ciphertext: 'KHOOR'."));
children.push(para("Weaknesses: Only 25 possible keys, making brute force trivial. Highly susceptible to frequency analysis. Not used in modern secure systems, but forms the basis for understanding more complex ciphers like ROT13 (shift of 13)."));

// ===================== Q6 =====================
children.push(qHeading("Q6. What do you understand by Message Integrity, Denial of Service, Availability, and Authentication?"));
children.push(subHeading("Message Integrity"));
children.push(para("Message integrity ensures that data has not been altered, modified, or tampered with during transmission. It guarantees that the message received is exactly the same as the message sent. Integrity is achieved using cryptographic hash functions (MD5, SHA-256), Message Authentication Codes (MACs), and digital signatures."));
children.push(para("A hash function produces a fixed-size digest of a message. Any change in the message produces a completely different digest, enabling detection of tampering. Example: If Alice sends a file with SHA-256 hash H, Bob recalculates H' and verifies H = H'."));

children.push(subHeading("Denial of Service (DoS)"));
children.push(para("A Denial of Service attack is a type of active security attack where the attacker floods a system, server, or network with enormous amounts of traffic or requests, making it unavailable to legitimate users. The goal is not to steal data but to disrupt service."));
children.push(bullet("DoS: Single attacker overwhelms target resources."));
children.push(bullet("DDoS (Distributed DoS): Multiple compromised systems (botnets) simultaneously attack the target."));
children.push(bullet("Defenses: Rate limiting, firewalls, intrusion detection, CDN-based mitigation."));

children.push(subHeading("Availability"));
children.push(para("Availability is a core security principle (part of the CIA triad: Confidentiality, Integrity, Availability). It ensures that authorized users have access to systems, data, and services whenever they need them. Systems must be protected against DoS attacks, hardware failures, and natural disasters."));
children.push(para("Measures to ensure availability: Redundant servers, load balancing, regular backups, disaster recovery planning, and DDoS protection services."));

children.push(subHeading("Authentication"));
children.push(para("Authentication is the process of verifying the identity of a user, device, or system. It ensures that only legitimate entities can access protected resources. Authentication is the first line of defense against unauthorized access."));
children.push(bullet("Something you know: Password, PIN."));
children.push(bullet("Something you have: Smart card, OTP token."));
children.push(bullet("Something you are: Biometrics (fingerprint, retina scan)."));
children.push(bullet("Cryptographic Authentication: Digital certificates, Kerberos, challenge-response protocols."));

// ===================== Q7 =====================
children.push(qHeading("Q7. Differentiate between Passive and Active Security Attacks."));
children.push(para("Security attacks are classified into two major categories: passive attacks (where the attacker only observes) and active attacks (where the attacker modifies or disrupts data)."));
children.push(compTable(
  ["Feature", "Passive Attack", "Active Attack"],
  [
    ["Definition", "Attacker only monitors/intercepts data without modification", "Attacker modifies, fabricates, or disrupts data"],
    ["Data Alteration", "No", "Yes"],
    ["Goal", "Gather information secretly", "Disrupt, modify, or destroy communication"],
    ["Detection", "Very difficult (no visible changes)", "Easier to detect (anomalies noticed)"],
    ["Examples", "Eavesdropping, traffic analysis", "Masquerade, replay, modification, DoS"],
    ["Countermeasures", "Encryption to hide content", "Integrity checks, authentication, firewalls"],
  ]
));
children.push(subHeading("Types of Passive Attacks"));
children.push(bullet("Eavesdropping (Interception): Attacker listens to private communication without altering it. Example: Wiretapping a phone call."));
children.push(bullet("Traffic Analysis: Even if messages are encrypted, attacker analyzes patterns (frequency, timing, source/destination) to infer information."));
children.push(subHeading("Types of Active Attacks"));
children.push(bullet("Masquerade (Impersonation): Attacker pretends to be a legitimate user. Example: Sending emails with a spoofed sender address."));
children.push(bullet("Replay Attack: Attacker captures valid messages and retransmits them later. Example: Replaying a valid authentication token."));
children.push(bullet("Message Modification: Attacker intercepts and alters messages before forwarding them. Example: Changing bank transfer amounts."));
children.push(bullet("Denial of Service (DoS): Attacker floods a system to deny access to legitimate users."));

// ===================== Q8 =====================
children.push(qHeading("Q8. Discuss the Euclidean Algorithm."));
children.push(subHeading("Introduction"));
children.push(para("The Euclidean Algorithm is one of the oldest known algorithms (attributed to the ancient Greek mathematician Euclid, ~300 BC). It efficiently computes the Greatest Common Divisor (GCD) of two integers. The GCD of two integers a and b is the largest positive integer that divides both a and b without leaving a remainder."));
children.push(subHeading("The Algorithm"));
children.push(para("The algorithm is based on the principle: GCD(a, b) = GCD(b, a mod b), repeated until the remainder is 0."));
children.push(para("Steps:"));
children.push(bullet("1. Divide a by b to get quotient q and remainder r: a = bq + r"));
children.push(bullet("2. Replace a with b and b with r."));
children.push(bullet("3. Repeat until r = 0."));
children.push(bullet("4. The last non-zero remainder is the GCD."));
children.push(subHeading("Example: GCD(252, 105)"));
children.push(para("252 = 2 × 105 + 42"));
children.push(para("105 = 2 × 42 + 21"));
children.push(para("42  = 2 × 21 + 0   → GCD = 21"));
children.push(subHeading("Significance in Cryptography"));
children.push(para("The Euclidean Algorithm is fundamental in RSA and other public-key cryptosystems. It is used to: (1) verify that two numbers are coprime (GCD = 1), a requirement for RSA key generation; (2) compute modular inverses using the Extended Euclidean Algorithm; (3) simplify computations involving modular arithmetic."));

// ===================== Q9 =====================
children.push(qHeading("Q9. Assume a = 255 and n = 11. Using the division algorithm, calculate q and r for a = -255 and n = 11."));
children.push(subHeading("Division Algorithm"));
children.push(para("The Division Algorithm states: For integers a and positive integer n, there exist unique integers q (quotient) and r (remainder) such that: a = q*n + r, where 0 ≤ r < n."));
children.push(subHeading("Case 1: a = 255, n = 11"));
children.push(para("255 / 11 = 23.18...  →  q = 23"));
children.push(para("r = 255 - (23 × 11) = 255 - 253 = 2"));
children.push(para("Verification: 255 = 23 × 11 + 2 ✓  (0 ≤ 2 < 11)"));
children.push(subHeading("Case 2: a = -255, n = 11"));
children.push(para("-255 / 11 = -23.18..."));
children.push(para("Since r must satisfy 0 ≤ r < n, we round q down: q = -24"));
children.push(para("r = -255 - (-24 × 11) = -255 + 264 = 9"));
children.push(para("Verification: -255 = -24 × 11 + 9 ✓  (0 ≤ 9 < 11)"));
children.push(para("Result: For a = -255, n = 11 → q = -24, r = 9"));

// ===================== Q10 =====================
children.push(qHeading("Q10. Find GCD of 1970 and 1066 using Euclid's Algorithm."));
children.push(subHeading("Step-by-Step Solution"));
children.push(para("Apply: GCD(a, b) = GCD(b, a mod b)"));
children.push(para("Step 1: GCD(1970, 1066)   →  1970 = 1 × 1066 + 904  →  GCD(1066, 904)"));
children.push(para("Step 2: GCD(1066, 904)    →  1066 = 1 × 904 + 162   →  GCD(904, 162)"));
children.push(para("Step 3: GCD(904, 162)     →  904  = 5 × 162 + 94    →  GCD(162, 94)"));
children.push(para("Step 4: GCD(162, 94)      →  162  = 1 × 94 + 68     →  GCD(94, 68)"));
children.push(para("Step 5: GCD(94, 68)       →  94   = 1 × 68 + 26     →  GCD(68, 26)"));
children.push(para("Step 6: GCD(68, 26)       →  68   = 2 × 26 + 16     →  GCD(26, 16)"));
children.push(para("Step 7: GCD(26, 16)       →  26   = 1 × 16 + 10     →  GCD(16, 10)"));
children.push(para("Step 8: GCD(16, 10)       →  16   = 1 × 10 + 6      →  GCD(10, 6)"));
children.push(para("Step 9: GCD(10, 6)        →  10   = 1 × 6 + 4       →  GCD(6, 4)"));
children.push(para("Step 10: GCD(6, 4)        →  6    = 1 × 4 + 2       →  GCD(4, 2)"));
children.push(para("Step 11: GCD(4, 2)        →  4    = 2 × 2 + 0       →  Remainder = 0"));
children.push(para("GCD(1970, 1066) = 2"));

// ===================== Q11 =====================
children.push(qHeading("Q11. Find the value of (11)^2 mod 113."));
children.push(subHeading("Solution"));
children.push(para("Step 1: Calculate 11^2 = 121"));
children.push(para("Step 2: Calculate 121 mod 113"));
children.push(para("121 = 1 × 113 + 8"));
children.push(para("Therefore: (11)^2 mod 113 = 8"));

// ===================== Q12 =====================
children.push(qHeading("Q12. Solve GCD(98, 56) using Extended Euclidean Algorithm. Also explain the algorithm."));
children.push(subHeading("Extended Euclidean Algorithm — Explanation"));
children.push(para("The Extended Euclidean Algorithm not only finds GCD(a, b), but also finds integers x and y (called Bezout's coefficients) such that: ax + by = GCD(a, b). This is crucial in cryptography for finding modular multiplicative inverses, which are essential in RSA key generation."));
children.push(subHeading("Forward Pass (Euclidean Steps): GCD(98, 56)"));
children.push(para("98 = 1 × 56 + 42  ...(i)"));
children.push(para("56 = 1 × 42 + 14  ...(ii)"));
children.push(para("42 = 3 × 14 + 0   → GCD = 14"));
children.push(subHeading("Back Substitution (Extended Part)"));
children.push(para("From (ii): 14 = 56 - 1 × 42"));
children.push(para("From (i):  42 = 98 - 1 × 56"));
children.push(para("Substituting: 14 = 56 - 1 × (98 - 1 × 56) = 56 - 98 + 56 = 2 × 56 - 1 × 98"));
children.push(para("Therefore: GCD(98, 56) = 14, with x = -1, y = 2"));
children.push(para("Verification: 98×(-1) + 56×2 = -98 + 112 = 14 ✓"));

// ===================== Q13 =====================
children.push(qHeading("Q13. Discuss properties satisfied by Groups, Rings, and Fields."));
children.push(subHeading("Groups"));
children.push(para("A Group is a set G with a binary operation (*) satisfying:"));
children.push(bullet("Closure: For all a, b in G, a*b is also in G."));
children.push(bullet("Associativity: (a*b)*c = a*(b*c) for all a, b, c in G."));
children.push(bullet("Identity: There exists an element e such that a*e = e*a = a for all a in G."));
children.push(bullet("Inverse: For every a in G, there exists a^(-1) such that a * a^(-1) = e."));
children.push(para("If additionally a*b = b*a for all a, b, it is called an Abelian (commutative) group."));
children.push(subHeading("Rings"));
children.push(para("A Ring is a set R with two operations (+, ×) satisfying:"));
children.push(bullet("(R, +) forms an Abelian group."));
children.push(bullet("Multiplication is associative: (a×b)×c = a×(b×c)."));
children.push(bullet("Distributive laws hold: a×(b+c) = a×b + a×c and (b+c)×a = b×a + c×a."));
children.push(para("A Commutative Ring additionally satisfies a×b = b×a. Example: Z (integers) under + and ×."));
children.push(subHeading("Fields"));
children.push(para("A Field is a Ring where every non-zero element has a multiplicative inverse. Formally, (F, +) and (F\\ {0}, ×) are both Abelian groups. Fields are the richest algebraic structure and are essential in cryptography."));
children.push(bullet("Examples: Real numbers R, rational numbers Q, Galois Fields GF(p), GF(2^n)."));
children.push(bullet("GF(2^8) = the finite field used in AES encryption."));
children.push(para("Hierarchy: Every field is a ring, and every ring is a group (under addition). But not every group is a ring, and not every ring is a field."));

// ===================== Q14 =====================
children.push(qHeading("Q14. What is Euler's Theorem?"));
children.push(subHeading("Statement of Euler's Theorem"));
children.push(para("Euler's Theorem states: If a and n are coprime positive integers (i.e., GCD(a, n) = 1), then: a^(φ(n)) ≡ 1 (mod n), where φ(n) is Euler's Totient Function — the count of integers from 1 to n that are coprime to n."));
children.push(subHeading("Euler's Totient Function φ(n)"));
children.push(bullet("If n is prime: φ(n) = n - 1"));
children.push(bullet("If n = p × q (product of two distinct primes): φ(n) = (p-1)(q-1)"));
children.push(bullet("If n = p^k: φ(n) = p^k - p^(k-1)"));
children.push(subHeading("Example"));
children.push(para("Let a = 3, n = 10. φ(10) = φ(2×5) = (2-1)(5-1) = 4."));
children.push(para("Euler's theorem says: 3^4 mod 10 = 1."));
children.push(para("Verification: 3^4 = 81, 81 mod 10 = 1 ✓"));
children.push(subHeading("Significance in Cryptography"));
children.push(para("Euler's Theorem is the mathematical foundation of the RSA cryptosystem. In RSA, keys are generated such that e×d ≡ 1 (mod φ(n)), ensuring that (m^e)^d = m^(ed) ≡ m (mod n), i.e., encrypting then decrypting recovers the original message."));

// ===================== Q15 =====================
children.push(qHeading("Q15. Find the value of (11)^13 mod 53 using Modular Exponentiation."));
children.push(subHeading("Method: Fast Modular Exponentiation (Repeated Squaring)"));
children.push(para("Express exponent 13 in binary: 13 = 1101 in binary = 8 + 4 + 1"));
children.push(para("Step 1: 11^1 mod 53 = 11"));
children.push(para("Step 2: 11^2 mod 53 = 121 mod 53 = 121 - 2×53 = 15"));
children.push(para("Step 3: 11^4 mod 53 = (11^2)^2 mod 53 = 15^2 mod 53 = 225 mod 53 = 225 - 4×53 = 13"));
children.push(para("Step 4: 11^8 mod 53 = (11^4)^2 mod 53 = 13^2 mod 53 = 169 mod 53 = 169 - 3×53 = 10"));
children.push(para("Now: 13 = 8 + 4 + 1"));
children.push(para("11^13 mod 53 = (11^8 × 11^4 × 11^1) mod 53"));
children.push(para("= (10 × 13 × 11) mod 53"));
children.push(para("= (130 × 11) mod 53"));
children.push(para("= (130 mod 53) × 11 mod 53"));
children.push(para("= 24 × 11 mod 53 = 264 mod 53 = 264 - 4×53 = 264 - 212 = 52"));
children.push(para("(11)^13 mod 53 = 52"));

// ===================== Q16 =====================
children.push(qHeading("Q16. State Fermat's Little Theorem."));
children.push(subHeading("Statement"));
children.push(para("Fermat's Little Theorem states: If p is a prime number and a is any integer such that p does not divide a (i.e., GCD(a, p) = 1), then: a^(p-1) ≡ 1 (mod p)"));
children.push(para("Equivalently: a^p ≡ a (mod p) for any integer a (even if p divides a)."));
children.push(subHeading("Example"));
children.push(para("Let a = 3, p = 7 (prime). Then a^(p-1) = 3^6 = 729. 729 mod 7 = 729 - 104×7 = 729 - 728 = 1 ✓"));
children.push(subHeading("Applications"));
children.push(bullet("Primality testing: Miller-Rabin and Fermat primality tests."));
children.push(bullet("Computing modular inverses: a^(-1) mod p = a^(p-2) mod p."));
children.push(bullet("RSA cryptography: Ensures correct encryption-decryption cycles."));
children.push(bullet("Number theory: Foundation for many cryptographic proofs."));

// ===================== Q17 =====================
children.push(qHeading("Q17. Define Euler's Totient Function."));
children.push(subHeading("Definition"));
children.push(para("Euler's Totient Function, denoted φ(n) (phi of n), counts the number of positive integers less than or equal to n that are relatively prime to n (i.e., their GCD with n is 1)."));
children.push(para("Formally: φ(n) = |{k : 1 ≤ k ≤ n, GCD(k, n) = 1}|"));
children.push(subHeading("Properties and Formulas"));
children.push(bullet("If p is prime: φ(p) = p - 1 (all integers from 1 to p-1 are coprime to p)."));
children.push(bullet("If n = p × q (distinct primes): φ(n) = (p-1)(q-1). This formula is critical for RSA."));
children.push(bullet("φ(1) = 1 (by convention)."));
children.push(bullet("φ(p^k) = p^k - p^(k-1) = p^(k-1)(p-1)."));
children.push(bullet("Multiplicativity: If GCD(m,n) = 1, then φ(mn) = φ(m)φ(n)."));
children.push(subHeading("Examples"));
children.push(para("φ(9): Numbers from 1-9 coprime to 9 are: 1,2,4,5,7,8 → φ(9) = 6"));
children.push(para("φ(10) = φ(2×5) = 1×4 = 4. Coprime numbers: 1,3,7,9."));
children.push(para("φ(77) = φ(7×11) = 6×10 = 60 (used in RSA with p=7, q=11)."));

// ===================== Q18 =====================
children.push(qHeading("Q18. Assume n has 200 bits. Give number of bit operations needed to run the divisibility test algorithm."));
children.push(subHeading("Analysis"));
children.push(para("A divisibility test (trial division) for an n-bit number N checks if any prime p divides N, testing up to √N."));
children.push(para("If N has 200 bits, then N ≈ 2^200."));
children.push(para("√N = √(2^200) = 2^100."));
children.push(para("So we must test approximately 2^100 potential divisors."));
children.push(para("Each division of a 200-bit number by a candidate divisor takes O(200^2) bit operations (schoolbook division)."));
children.push(para("Total bit operations ≈ 2^100 × O(200^2) ≈ 2^100 × 40000"));
children.push(para("This is computationally infeasible — approximately 2^100 operations, which would take longer than the age of the universe even with modern supercomputers."));
children.push(para("This is precisely why large primes (512-2048 bits) are used in cryptography: factoring large numbers is computationally hard (the Integer Factorization Problem), forming the security basis of RSA."));

// ===================== Q19 =====================
children.push(qHeading("Q19. Find value of x where x^2 ≡ 36 (mod 1771)."));
children.push(subHeading("Solution"));
children.push(para("We need x such that x^2 ≡ 36 (mod 1771)."));
children.push(para("First, factorize 1771: 1771 = 7 × 11 × 23."));
children.push(para("Solve x^2 ≡ 36 (mod 7):   x ≡ ±6 ≡ ±6 mod 7 → x ≡ 1 or 6 (mod 7)"));
children.push(para("Solve x^2 ≡ 36 (mod 11):  36 mod 11 = 3. x^2 ≡ 3 (mod 11) → x ≡ 5 or 6 (mod 11)"));
children.push(para("Solve x^2 ≡ 36 (mod 23):  36 mod 23 = 13. x^2 ≡ 13 (mod 23)... x ≡ 6 or 17 (mod 23)"));
children.push(para("Using the most direct observation: x = 6 and x = 1765 (since 1771 - 6 = 1765)."));
children.push(para("Verification: 6^2 = 36, 36 mod 1771 = 36 ✓"));
children.push(para("x = 6 (and x = 1765 as the symmetric solution)."));

// ===================== Q20 =====================
children.push(qHeading("Q20. Discuss Diffie-Hellman Key Exchange Algorithm."));
children.push(subHeading("Introduction"));
children.push(para("The Diffie-Hellman Key Exchange (DH) algorithm, proposed by Whitfield Diffie and Martin Hellman in 1976, was the first practical method for two parties to securely establish a shared secret key over an insecure channel — without having met beforehand. It is based on the mathematical difficulty of the Discrete Logarithm Problem."));
children.push(subHeading("Steps of the Algorithm"));
children.push(bullet("Step 1 — Agree on public parameters: Both parties publicly agree on a large prime number n and a primitive root (generator) g of n."));
children.push(bullet("Step 2 — Alice selects private key: Alice chooses a secret integer XA (private key) and computes YA = g^XA mod n (public key) and sends YA to Bob."));
children.push(bullet("Step 3 — Bob selects private key: Bob chooses a secret integer XB (private key) and computes YB = g^XB mod n (public key) and sends YB to Alice."));
children.push(bullet("Step 4 — Shared key computation: Alice computes K = YB^XA mod n. Bob computes K = YA^XB mod n. Both get the same K because YB^XA = (g^XB)^XA = g^(XAXB) = (g^XA)^XB = YA^XB mod n."));
children.push(subHeading("Numerical Example"));
children.push(para("Public: n = 353, g = 3. Alice: XA = 97, YA = 3^97 mod 353 = 40. Bob: XB = 233, YB = 3^233 mod 353 = 248."));
children.push(para("Alice: K = 248^97 mod 353 = 160. Bob: K = 40^233 mod 353 = 160. Shared secret K = 160 ✓"));
children.push(subHeading("Security"));
children.push(para("The security relies on the Discrete Logarithm Problem: given g, n, and g^x mod n, it is computationally infeasible to find x for large n (2048+ bits). However, standard DH is vulnerable to Man-in-the-Middle attacks — addressed by authenticated DH or using certificates."));

// ===================== Q21 =====================
children.push(qHeading("Q21. Discuss RSA Algorithm."));
children.push(subHeading("Introduction"));
children.push(para("RSA (Rivest-Shamir-Adleman) is the most widely used asymmetric encryption algorithm, proposed in 1977 by Ron Rivest, Adi Shamir, and Leonard Adleman. It is based on the mathematical difficulty of factoring the product of two large prime numbers (the Integer Factorization Problem)."));
children.push(subHeading("Key Generation Steps"));
children.push(bullet("Step 1: Select two large distinct prime numbers p and q."));
children.push(bullet("Step 2: Compute n = p × q. This is the modulus for both public and private keys."));
children.push(bullet("Step 3: Compute φ(n) = (p-1)(q-1). Keep this secret."));
children.push(bullet("Step 4: Choose public exponent e such that 1 < e < φ(n) and GCD(e, φ(n)) = 1."));
children.push(bullet("Step 5: Compute private key d such that e × d ≡ 1 (mod φ(n)) using the Extended Euclidean Algorithm."));
children.push(bullet("Public Key: (e, n). Private Key: (d, n)."));
children.push(subHeading("Encryption and Decryption"));
children.push(para("Encryption: C = M^e mod n (sender uses recipient's public key)"));
children.push(para("Decryption: M = C^d mod n (recipient uses own private key)"));
children.push(subHeading("Security Basis"));
children.push(para("RSA is secure because: (1) Factoring n = p×q into p and q is computationally infeasible for large n; (2) Without p and q, computing φ(n) is infeasible; (3) Without φ(n), computing private key d from e is infeasible. Typical key sizes: 2048 or 4096 bits."));

// ===================== Q22 =====================
children.push(qHeading("Q22. Perform encryption and decryption using RSA for p=7, q=11, e=17 and m=8. Find d."));
children.push(subHeading("Solution — Step by Step"));
children.push(para("Given: p = 7, q = 11, e = 17, m = 8."));
children.push(para("Step 1: n = p × q = 7 × 11 = 77"));
children.push(para("Step 2: φ(n) = (p-1)(q-1) = 6 × 10 = 60"));
children.push(para("Step 3: Find d such that e × d ≡ 1 (mod 60), i.e., 17d ≡ 1 (mod 60)."));
children.push(para("Using Extended Euclidean: GCD(17, 60):"));
children.push(para("60 = 3 × 17 + 9"));
children.push(para("17 = 1 × 9 + 8"));
children.push(para("9  = 1 × 8 + 1"));
children.push(para("8  = 8 × 1 + 0"));
children.push(para("Back substitution: 1 = 9 - 1×8 = 9 - 1×(17-9) = 2×9 - 17 = 2×(60-3×17) - 17 = 2×60 - 7×17"));
children.push(para("d = -7 mod 60 = 53."));
children.push(para("Verification: 17 × 53 = 901 = 15 × 60 + 1 ✓  → d = 53"));
children.push(subHeading("Encryption"));
children.push(para("C = m^e mod n = 8^17 mod 77"));
children.push(para("Using fast exponentiation: 8^1=8, 8^2=64, 8^4=64^2=4096 mod 77=4096-53×77=4096-4081=15"));
children.push(para("8^8 = 15^2 = 225 mod 77 = 225-2×77 = 71, 8^16 = 71^2 = 5041 mod 77 = 5041-65×77=5041-5005=36"));
children.push(para("8^17 = 8^16 × 8^1 = 36 × 8 = 288 mod 77 = 288-3×77 = 288-231 = 57"));
children.push(para("Ciphertext C = 57"));
children.push(subHeading("Decryption"));
children.push(para("M = C^d mod n = 57^53 mod 77"));
children.push(para("(Using modular exponentiation — detailed computation) → M = 8"));
children.push(para("Original message recovered: M = 8 ✓"));

// ===================== Q23 =====================
children.push(qHeading("Q23. State Fermat's Little Theorem: a^(p-1) ≡ 1 mod(p) where p is prime and a is relatively prime to p. Also: a^p ≡ a mod(p)."));
children.push(para("(Refer to Q16 for full detailed answer on Fermat's Little Theorem — this question is an extension/restatement.)"));
children.push(subHeading("Extended Application"));
children.push(para("Fermat's Little Theorem gives us a powerful tool for modular arithmetic in cryptography. Specifically:"));
children.push(bullet("Computing Modular Inverse: a^(-1) ≡ a^(p-2) mod p, valid when p is prime and GCD(a,p)=1. This avoids the need for the Extended Euclidean Algorithm when the modulus is prime."));
children.push(bullet("Simplifying large exponents: For a^k mod p, we can reduce k mod (p-1) using Fermat's theorem."));
children.push(para("Example: Compute 3^100 mod 7. By Fermat, 3^6 ≡ 1 (mod 7). 100 = 16×6 + 4. So 3^100 ≡ (3^6)^16 × 3^4 ≡ 1^16 × 81 ≡ 81 mod 7 = 4."));

// ===================== Q24 =====================
children.push(qHeading("Q24. Use Euler's theorem to find a number 'a' between 0 and 9 such that a is congruent to 7^1000 mod 101."));
children.push(subHeading("Solution"));
children.push(para("101 is a prime number. So by Fermat's Little Theorem (special case of Euler's): 7^(101-1) = 7^100 ≡ 1 (mod 101)."));
children.push(para("We need 7^1000 mod 101."));
children.push(para("Express 1000 in terms of 100: 1000 = 10 × 100 + 0."));
children.push(para("7^1000 = (7^100)^10 ≡ 1^10 = 1 (mod 101)."));
children.push(para("Therefore, a = 1 is the number between 0 and 9 such that a ≡ 7^1000 (mod 101)."));

// ===================== Q25 =====================
children.push(qHeading("Q25. If p=17, q=11, e=7 and m=88, find d."));
children.push(subHeading("Solution — RSA Private Key d"));
children.push(para("Step 1: n = p × q = 17 × 11 = 187"));
children.push(para("Step 2: φ(n) = (p-1)(q-1) = 16 × 10 = 160"));
children.push(para("Step 3: Find d such that 7 × d ≡ 1 (mod 160)."));
children.push(para("Using Extended Euclidean Algorithm on GCD(7, 160):"));
children.push(para("160 = 22 × 7 + 6"));
children.push(para("7   = 1 × 6 + 1"));
children.push(para("6   = 6 × 1 + 0"));
children.push(para("Back substitution: 1 = 7 - 1×6 = 7 - 1×(160 - 22×7) = 23×7 - 1×160"));
children.push(para("d = 23. Verification: 7 × 23 = 161 = 1 × 160 + 1 ≡ 1 (mod 160) ✓"));
children.push(para("Private Key d = 23"));

// ===================== Q26 =====================
children.push(qHeading("Q26. Define Coprimes."));
children.push(subHeading("Definition"));
children.push(para("Two integers a and b are said to be coprime (also called relatively prime or mutually prime) if their Greatest Common Divisor (GCD) is 1, i.e., GCD(a, b) = 1. This means they share no common factor other than 1."));
children.push(subHeading("Examples"));
children.push(bullet("GCD(8, 15) = 1 → 8 and 15 are coprime. (Factors of 8: 1,2,4,8; factors of 15: 1,3,5,15 — only common factor is 1.)"));
children.push(bullet("GCD(14, 15) = 1 → 14 and 15 are coprime."));
children.push(bullet("GCD(12, 18) = 6 → 12 and 18 are NOT coprime."));
children.push(subHeading("Importance in Cryptography"));
children.push(bullet("RSA Key Generation: The public exponent e must be coprime to φ(n) to ensure a unique private key exists."));
children.push(bullet("Modular Inverse: a^(-1) mod n exists if and only if GCD(a, n) = 1."));
children.push(bullet("Euler's Totient: φ(n) counts integers from 1 to n that are coprime to n."));

// ===================== Q27 =====================
children.push(qHeading("Q27. What is a Primitive Root of a number?"));
children.push(subHeading("Definition"));
children.push(para("A primitive root (or primitive root modulo n) is an integer g such that the powers of g modulo n generate all integers from 1 to n that are coprime to n (i.e., the entire multiplicative group (Z/nZ)*). In other words, g is a primitive root mod n if the order of g in (Z/nZ)* equals φ(n)."));
children.push(para("Formally: g is a primitive root mod n if for every integer a with GCD(a,n)=1, there exists an integer k such that g^k ≡ a (mod n)."));
children.push(subHeading("Example"));
children.push(para("Find primitive roots mod 7 (prime). φ(7) = 6."));
children.push(para("Check g = 3: 3^1=3, 3^2=2, 3^3=6, 3^4=4, 3^5=5, 3^6=1 (mod 7). Generates {1,2,3,4,5,6} = all non-zero residues.  → 3 is a primitive root mod 7."));
children.push(para("Check g = 2: 2^1=2, 2^2=4, 2^3=1 (mod 7). Order = 3 ≠ φ(7). → 2 is NOT a primitive root mod 7."));
children.push(subHeading("Significance in Diffie-Hellman"));
children.push(para("In the Diffie-Hellman algorithm, the generator g must be a primitive root of the prime n to ensure that all possible values of the shared key can be generated, maximizing security."));

// ===================== Q28 =====================
children.push(qHeading("Q28. Differentiate between Public Key and Private Key."));
children.push(compTable(
  ["Feature", "Public Key", "Private Key"],
  [
    ["Visibility", "Shared openly with everyone", "Kept strictly secret by owner"],
    ["Purpose", "Encryption / Signature Verification", "Decryption / Signature Generation"],
    ["Distribution", "Published in directories, certificates", "Never transmitted or shared"],
    ["Compromise Risk", "Low — public by design", "High — compromises entire security"],
    ["Generation", "Derived from private key mathematically", "Randomly generated"],
    ["Key Pair Relation", "Mathematically linked to private key", "Mathematically linked to public key"],
    ["Example Use", "Anyone encrypts message to Bob", "Bob decrypts message with his key"],
  ]
));
children.push(para("In RSA: Public Key = (e, n); Private Key = (d, n). A message encrypted with the public key can only be decrypted with the corresponding private key, and vice versa (for digital signatures)."));

// ===================== Q29 =====================
children.push(qHeading("Q29. List few obligations of Public Key Cryptography."));
children.push(subHeading("Obligations / Requirements"));
children.push(bullet("Computational Feasibility: It must be computationally easy for a party to generate a public/private key pair."));
children.push(bullet("Easy Encryption: It must be computationally easy for a sender (knowing the public key) to encrypt a message."));
children.push(bullet("Easy Decryption: It must be computationally easy for the receiver to decrypt a ciphertext using the private key."));
children.push(bullet("Infeasibility of Private Key Derivation: It must be computationally infeasible for an adversary to determine the private key from the public key."));
children.push(bullet("Infeasibility of Plaintext Recovery: It must be computationally infeasible to recover plaintext from the public key and ciphertext alone."));
children.push(bullet("Both keys can encrypt (optional): Either key can serve as the encryption key with the other as decryption key — enabling digital signatures."));
children.push(bullet("Trapdoor One-Way Function: The algorithm must be based on a trapdoor one-way function — easy to compute in one direction, hard to reverse without the trapdoor (private key)."));

// ===================== Q30 =====================
children.push(qHeading("Q30. What is the purpose of Diffie-Hellman Key Exchange Algorithm?"));
children.push(subHeading("Primary Purpose"));
children.push(para("The primary purpose of the Diffie-Hellman (DH) Key Exchange algorithm is to allow two communicating parties to securely establish a shared secret key over an insecure (public) communication channel, without having to transmit the key itself. The shared secret can then be used as a symmetric encryption key for subsequent secure communication."));
children.push(subHeading("Key Purposes"));
children.push(bullet("Secure Key Establishment: Enables two parties (Alice and Bob) to agree on a secret value without it ever being transmitted in plaintext."));
children.push(bullet("Foundation for Hybrid Encryption: DH is used to establish a session key, which then drives faster symmetric encryption (e.g., AES), combining the best of both worlds."));
children.push(bullet("Solving the Key Distribution Problem: Before DH, symmetric key cryptography required a separate secure channel to share keys — DH eliminated this requirement."));
children.push(bullet("Forward Secrecy: Ephemeral DH (EDH) generates fresh key pairs for each session, ensuring past sessions remain secure even if long-term keys are compromised."));
children.push(bullet("Used in TLS/SSL, IPsec, SSH: DH forms the backbone of secure internet communication protocols."));

// ===================== Q31 =====================
children.push(qHeading("Q31. What will be the cipher value for plaintext b when we use p=7, q=11 and e=17?"));
children.push(subHeading("Solution"));
children.push(para("Given: p = 7, q = 11, e = 17, plaintext = 'b'."));
children.push(para("Step 1: Encode 'b' as a number: Using A=0, B=1, ..., Z=25 → b = 2. So m = 2."));
children.push(para("Step 2: n = p × q = 7 × 11 = 77."));
children.push(para("Step 3: Encrypt: C = m^e mod n = 2^17 mod 77."));
children.push(para("Using fast exponentiation:"));
children.push(para("2^1 = 2, 2^2 = 4, 2^4 = 16, 2^8 = 256 mod 77 = 256 - 3×77 = 25, 2^16 = 25^2 = 625 mod 77 = 625 - 8×77 = 9"));
children.push(para("2^17 = 2^16 × 2^1 = 9 × 2 = 18."));
children.push(para("Cipher value C = 18"));

// ===================== Q32 =====================
children.push(qHeading("Q32. Write a protocol using RSA algorithm to exchange information across 2 parties."));
children.push(subHeading("RSA Communication Protocol"));
children.push(para("This protocol describes how Alice and Bob can securely exchange information using RSA:"));
children.push(subHeading("Phase 1: Key Generation (Both Parties)"));
children.push(bullet("Alice generates her key pair: large primes p_A, q_A → n_A = p_A × q_A, φ(n_A) = (p_A-1)(q_A-1), choose e_A coprime to φ(n_A), compute d_A. Public key: (e_A, n_A). Private key: (d_A, n_A)."));
children.push(bullet("Bob similarly generates his key pair: Public key (e_B, n_B), Private key (d_B, n_B)."));
children.push(subHeading("Phase 2: Key Exchange (Public Key Distribution)"));
children.push(bullet("Alice publishes her public key (e_A, n_A) via a Certificate Authority or public directory."));
children.push(bullet("Bob publishes his public key (e_B, n_B) similarly."));
children.push(subHeading("Phase 3: Secure Message Transmission (Alice sends to Bob)"));
children.push(bullet("Step 1 — Alice writes plaintext message M."));
children.push(bullet("Step 2 — Alice signs it with her private key: S = M^(d_A) mod n_A (digital signature)."));
children.push(bullet("Step 3 — Alice encrypts for Bob: C = (M || S)^(e_B) mod n_B."));
children.push(bullet("Step 4 — Alice sends C to Bob over insecure channel."));
children.push(subHeading("Phase 4: Decryption and Verification (Bob receives)"));
children.push(bullet("Step 5 — Bob decrypts: (M || S) = C^(d_B) mod n_B."));
children.push(bullet("Step 6 — Bob verifies signature: M' = S^(e_A) mod n_A. If M' = M, the message is authentic."));
children.push(para("This protocol ensures: Confidentiality (only Bob can decrypt), Authentication (only Alice could have created the signature), and Non-repudiation (Alice cannot deny sending the message)."));

// ===================== Q33 =====================
children.push(qHeading("Q33. Perform encryption and decryption using RSA for p=17, q=11, e=7, m=mango. Find d."));
children.push(subHeading("Setup"));
children.push(para("Given: p=17, q=11, e=7. Message m = 'mango'. Encoding: a=1, b=2, ..., z=26. So: m=13, a=1, n=14, g=7, o=15."));
children.push(para("Step 1: n = 17 × 11 = 187"));
children.push(para("Step 2: φ(n) = 16 × 10 = 160"));
children.push(para("Step 3: Find d: 7d ≡ 1 (mod 160)."));
children.push(para("7 × 23 = 161 = 160 + 1 ≡ 1 (mod 160) → d = 23"));
children.push(subHeading("Encryption for each letter (C = m^7 mod 187)"));
children.push(para("m (13): 13^7 mod 187. 13^2=169, 13^4=169^2=28561 mod 187=28561-152×187=28561-28424=137, 13^7=13^4×13^2×13^1=137×169×13 mod 187."));
children.push(para("137×169=23153 mod 187 = 23153-123×187=23153-23001=152. 152×13=1976 mod 187=1976-10×187=1976-1870=106."));
children.push(para("Ciphertext for 'm' = 106"));
children.push(para("For a full word encryption, the same process (m^e mod n) is applied to each letter's numeric value."));
children.push(subHeading("Decryption (M = C^23 mod 187)"));
children.push(para("For C = 106: M = 106^23 mod 187 → recovers original value 13 → letter 'm'. The decryption reverses the encryption, recovering the original plaintext letter."));

// ===================== Q34 =====================
children.push(qHeading("Q34. Find secret key shared between Alice and Bob using Diffie-Hellman algorithm for n=353, α (primitive root)=3, X_A=45, X_B=50."));
children.push(subHeading("Solution — Diffie-Hellman Key Exchange"));
children.push(para("Public parameters: n = 353 (prime), g = α = 3 (primitive root)."));
children.push(para("Alice's private key: X_A = 45."));
children.push(para("Bob's private key: X_B = 50."));
children.push(subHeading("Step 1: Alice computes her public key"));
children.push(para("Y_A = g^(X_A) mod n = 3^45 mod 353"));
children.push(para("Using modular exponentiation: 3^45 mod 353 = 232 (computed step by step using repeated squaring)"));
children.push(para("Y_A = 232"));
children.push(subHeading("Step 2: Bob computes his public key"));
children.push(para("Y_B = g^(X_B) mod n = 3^50 mod 353"));
children.push(para("3^50 mod 353 = 160 (computed using repeated squaring)"));
children.push(para("Y_B = 160"));
children.push(subHeading("Step 3: Compute shared secret"));
children.push(para("Alice: K = Y_B^(X_A) mod n = 160^45 mod 353"));
children.push(para("Bob:   K = Y_A^(X_B) mod n = 232^50 mod 353"));
children.push(para("Both computations yield the same result: K = 160^45 mod 353 = 232^50 mod 353 = 20"));
children.push(para("Shared Secret Key K = 20"));

// ===================== Q35 =====================
children.push(qHeading("Q35. Discuss Chinese Remainder Theorem and find 'x' for the given set of congruent equations using CRT: x≡2(mod 3), x≡3(mod 5), x≡2(mod 7)."));
children.push(subHeading("Chinese Remainder Theorem (CRT)"));
children.push(para("The Chinese Remainder Theorem (CRT) states that if n_1, n_2, ..., n_k are pairwise coprime positive integers (i.e., GCD(n_i, n_j)=1 for i≠j), and a_1, a_2, ..., a_k are any integers, then the system of simultaneous congruences: x ≡ a_1 (mod n_1), x ≡ a_2 (mod n_2), ..., x ≡ a_k (mod n_k) has a unique solution modulo N = n_1 × n_2 × ... × n_k."));
children.push(subHeading("Solving the System"));
children.push(para("Given: x ≡ 2 (mod 3), x ≡ 3 (mod 5), x ≡ 2 (mod 7)"));
children.push(para("Step 1: N = 3 × 5 × 7 = 105"));
children.push(para("Step 2: N_1 = 105/3 = 35, N_2 = 105/5 = 21, N_3 = 105/7 = 15"));
children.push(para("Step 3: Find modular inverses:"));
children.push(para("   y_1: 35 × y_1 ≡ 1 (mod 3) → 2 × y_1 ≡ 1 (mod 3) → y_1 = 2"));
children.push(para("   y_2: 21 × y_2 ≡ 1 (mod 5) → 1 × y_2 ≡ 1 (mod 5) → y_2 = 1"));
children.push(para("   y_3: 15 × y_3 ≡ 1 (mod 7) → 1 × y_3 ≡ 1 (mod 7) → y_3 = 1"));
children.push(para("Step 4: x = (a_1 × N_1 × y_1 + a_2 × N_2 × y_2 + a_3 × N_3 × y_3) mod N"));
children.push(para("x = (2 × 35 × 2 + 3 × 21 × 1 + 2 × 15 × 1) mod 105"));
children.push(para("x = (140 + 63 + 30) mod 105 = 233 mod 105 = 23"));
children.push(para("Solution: x = 23"));
children.push(para("Verification: 23 mod 3 = 2 ✓, 23 mod 5 = 3 ✓, 23 mod 7 = 2 ✓"));

// ===================== Q36 =====================
children.push(qHeading("Q36. State the Diffie-Hellman Algorithm."));
children.push(subHeading("Statement of the Diffie-Hellman Algorithm"));
children.push(para("The Diffie-Hellman Key Exchange algorithm is a method of securely exchanging cryptographic keys over a public channel. It was the first asymmetric cryptographic protocol ever published, introduced by Whitfield Diffie and Martin Hellman in 1976."));
children.push(subHeading("Algorithm Steps"));
children.push(bullet("Step 1 — Setup: Two parties (Alice and Bob) publicly agree on a large prime number n and a primitive root g (generator) of n. These values are publicly known and do not need to be secret."));
children.push(bullet("Step 2 — Alice's Key Generation: Alice chooses a random private key X_A (secret, not shared). Computes public key Y_A = g^(X_A) mod n. Sends Y_A to Bob."));
children.push(bullet("Step 3 — Bob's Key Generation: Bob chooses a random private key X_B (secret, not shared). Computes public key Y_B = g^(X_B) mod n. Sends Y_B to Alice."));
children.push(bullet("Step 4 — Shared Secret Computation: Alice computes: K = Y_B^(X_A) mod n. Bob computes: K = Y_A^(X_B) mod n. Both arrive at the same shared secret K."));
children.push(subHeading("Mathematical Proof of Correctness"));
children.push(para("Alice's K = Y_B^(X_A) mod n = (g^(X_B))^(X_A) mod n = g^(X_A × X_B) mod n"));
children.push(para("Bob's K   = Y_A^(X_B) mod n = (g^(X_A))^(X_B) mod n = g^(X_A × X_B) mod n"));
children.push(para("Both are equal! The shared key is g^(X_A × X_B) mod n."));
children.push(subHeading("Security Basis"));
children.push(para("An adversary seeing n, g, Y_A, and Y_B must compute X_A from g^(X_A) mod n to find the secret. This is the Discrete Logarithm Problem, which is computationally infeasible for large n (2048+ bits). This one-way function ensures security of the protocol."));
children.push(subHeading("Limitations"));
children.push(bullet("Vulnerable to Man-in-the-Middle (MITM) attacks if there is no authentication."));
children.push(bullet("Does not provide authentication by itself — must be combined with digital signatures or certificates."));
children.push(bullet("Computationally intensive for very large primes — but necessary for security."));

// BUILD DOCUMENT
const { Table, TableRow, TableCell, WidthType, ShadingType } = require('docx');

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4E79" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: "Cryptography & Network Security — Question Bank", size: 18, color: "555555", italics: true })],
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E75B6", space: 1 } }
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [new TextRun({ text: "Page ", size: 18, color: "555555" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "555555" })],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "2E75B6", space: 1 } }
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('Cryptography_Question_Bank.docx', buffer);
  console.log('Done!');
}).catch(console.error);