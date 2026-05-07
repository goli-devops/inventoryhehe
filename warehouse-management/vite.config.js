import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function obfuscatorPlugin() {
  let isProduction = false;

  return {
    name: 'vite-plugin-obfuscator',
    configResolved(config) {
      isProduction = config.command === 'build' && config.mode !== 'development';
    },
    async generateBundle(options, bundle) {
      if (!isProduction) return;

      let JavaScriptObfuscator;
      try {
        JavaScriptObfuscator = (await import('javascript-obfuscator')).default;
      } catch {
        console.warn('[obfuscator] javascript-obfuscator not installed — skipping. Run: npm i -D javascript-obfuscator');
        return;
      }

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || !fileName.endsWith('.js')) continue;

        const result = JavaScriptObfuscator.obfuscate(chunk.code, {
          identifierNamesGenerator:    'mangled',  
          renameGlobals:               false,        
          renameProperties:            false,        

          stringArray:                 true,         
          stringArrayEncoding:         ['base64'],   
          stringArrayThreshold:        0.85,        
          stringArrayRotate:           true,
          stringArrayShuffle:          true,
          splitStrings:                true,         
          splitStringsChunkLength:     8,

          controlFlowFlattening:       true,       
          controlFlowFlatteningThreshold: 0.4,    
          deadCodeInjection:           true,        
          deadCodeInjectionThreshold:  0.2,         

          debugProtection:             true,       
          debugProtectionInterval:     4000,       
          disableConsoleOutput:        true,        
          selfDefending:               true,       

          sourceMap:                   false,    
          sourceMapMode:               'separate',


          compact:                     true,       
          simplify:                    true,
          numbersToExpressions:        true,       
          transformObjectKeys:         true,       
          unicodeEscapeSequence:       false,       
        });

        chunk.code = result.getObfuscatedCode();
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      react(),
      obfuscatorPlugin(),
    ],

    build: {
      sourcemap: false,    
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console:    true, 
          drop_debugger:   true,  
          passes:          3,    
          pure_funcs:      ['console.log', 'console.info', 'console.debug', 'console.warn'],
          unsafe:          true,  
          unsafe_math:     true,
        },
        mangle: {
          toplevel:        true,
          eval:            true,
          properties: {
            regex: /^_/,      
          },
        },
        format: {
          comments:        false, 
          ascii_only:      true, 
        },
      },

      rollupOptions: {
        output: {
          chunkFileNames:  'assets/[hash].js',
          entryFileNames:  'assets/[hash].js',
          assetFileNames:  'assets/[hash].[ext]',

          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('scheduler')) return 'fw';
              if (id.includes('supabase') || id.includes('realtime')) return 'db';
              if (id.includes('jspdf') || id.includes('autotable')) return 'pdf';
              return 'lib';
            }
          },
        },
      },
    },

    server: {
      sourcemapIgnoreList: () => true,
    },
  };
});