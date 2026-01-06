import React, { useEffect, useState } from "react";

const Typewriter = () => {
  const words = ["Time Tracker"]; // 👈 You can add more words in this array
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(150); // typing speed

  useEffect(() => {
    const currentWord = words[wordIndex];
    let typingSpeed = isDeleting ? 150 : 200;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // typing
        setText(currentWord.substring(0, text.length + 1));
        if (text === currentWord) {
          setTimeout(() => setIsDeleting(true), 1000); // wait before deleting
        }
      } else {
        // deleting
        setText(currentWord.substring(0, text.length - 1));
        if (text === "") {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length); // loop words
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [text, isDeleting, wordIndex, words]);

  return (
    <h1 className=" text-[3xl] md:text-4xl xl:text-7xl font-extrabold transition duration-200 ease-in-out py-2">
      <span>Real -  </span>
      {text}
      <span className="animate-pulse">|</span>
    </h1>
  );
};

export default Typewriter;
