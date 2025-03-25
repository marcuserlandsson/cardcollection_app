import { View, Text, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

type Params = {
    cardNumber: string;
}

// Rate limiter implementation
const rateLimiter = {
    tokens: 15, // Maximum number of tokens
    lastRefill: Date.now(),
    refillRate: 10000, // 10 seconds in milliseconds
    
    async getToken(): Promise<boolean> {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        
        // Refill tokens if enough time has passed
        if (timePassed >= this.refillRate) {
            this.tokens = 15;
            this.lastRefill = now;
        }
        
        if (this.tokens > 0) {
            this.tokens--;
            return true;
        }
        
        // Wait until next refill if no tokens available
        const waitTime = this.refillRate - timePassed;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.getToken();
    }
};

// Fetch card details using the Digimon Card API with rate limiting
async function fetchCardDetails(cardNumber: string) {
    try {
        await rateLimiter.getToken();
        const response = await fetch(`https://digimoncard.io/api-public/search.php?card=${cardNumber}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching card details:', error);
        throw error;
    }
}

export default function CardDetailsScreen() {
    const { cardNumber } = useLocalSearchParams<Params>();
    const cardDetails = fetchCardDetails(cardNumber);

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: `https://images.digimoncard.io/images/cards/${cardNumber}.jpg` }}
                style={styles.cardImage}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        padding: 16,
        alignItems: 'center',
    },
    cardImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 63/88,
        resizeMode: 'contain',
    },
});