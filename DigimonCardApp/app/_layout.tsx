import { Stack, usePathname, Link } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  const pathname = usePathname();
  
  // Only hide back button on index and database screens
  const hideBackButton = ['/', '/database', '/collection'].includes(pathname);
  
  const getBackPath = () => {
    if (pathname.includes('cardDetails')) return '/(tabs)/cardList';
    if (pathname.includes('cardList')) return '/(tabs)/database';
    return '/';
  };
  
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{
          headerShown: true,
          headerTitle: "",
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerShadowVisible: false,
          headerLeft: () => (
            !hideBackButton ? (
              <Link href={getBackPath()} asChild>
                <TouchableOpacity>
                  <Ionicons 
                    name="chevron-back" 
                    size={26} 
                    color="#0865a3" 
                    style={{ marginLeft: 10 }}
                  />
                </TouchableOpacity>
              </Link>
            ) : null
          ),
        }}
      />
      <Stack.Screen name='+not-found'/>
    </Stack>
  );
}
