import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      secondary: string;
      tertiary: string;
      background: string;
      text: string;
      accent: string;
      buttonBg: string;
      buttonText: string;
      gridBg: string;
      gridLine: string;
      gridCell: string;
      lightGridCell: string;
      cardBg: string;
      controlBg: string;
    };
    fonts: {
      main: string;
      secondary: string;
      mono: string;
    };
    borderRadius: string;
    boxShadow: string;
    transition: string;
  }
} 