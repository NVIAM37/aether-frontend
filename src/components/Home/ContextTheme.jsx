import React, { createContext, useState } from "react";


export const ThemeContext = createContext();

const ContextTheme = ({children}) => {
  const [isDark, setIsDark] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, isOpen, setIsOpen }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ContextTheme
