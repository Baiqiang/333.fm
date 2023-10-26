import type { Config } from 'tailwindcss'
import form from '@tailwindcss/forms'

export default <Partial<Config>>{
  plugins: [form({
    strategy: 'base',
  })],
  theme: {
    extend: {
      colors: {
        logo: {
          f: '#fc6396',
          m: '#52c3ef',
        },
        if: '#fc6396',
        sf: '#52c3ef',
        weekly: '#f5f5f5',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
}
