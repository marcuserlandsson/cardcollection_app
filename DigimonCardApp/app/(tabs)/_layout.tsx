import { Tabs } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#0865a3',
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#25292e'
                },
            }}
        >
            <Tabs.Screen
            name='index'
            options={{
                title: 'Home',
                tabBarIcon: ({color, focused}) => (
                    <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24}/>
                )
                }}
            />
            <Tabs.Screen
            name='database'
            options={{
                title: 'Card Database',
                tabBarIcon: ({color, focused}) => (
                    <Ionicons name={focused ? 'albums-sharp' : 'albums-outline'} color={color} size={24}/>
                )
                }}
            />
            <Tabs.Screen
            name='collection'
            options={{
                title: 'Collection',
                tabBarIcon: ({color, focused}) => (
                    <Ionicons name={focused ? 'book-sharp' : 'book-outline'} color={color} size={24}/>
                )
                }}
            />
            <Tabs.Screen
                name="cardList"
                options={{
                    title: 'Card List',
                    href: null,
                }}
            />
            <Tabs.Screen
                name="cardDetails"
                options={{
                    title: 'Card Details',
                    href: null,
                }}
            />
        </Tabs>
    );
}