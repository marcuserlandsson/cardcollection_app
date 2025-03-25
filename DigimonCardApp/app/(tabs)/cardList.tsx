import { View, Text, StyleSheet, FlatList, Image, Dimensions, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Params = {
    setId: string;
    setTitle: string;
}

interface Card {
    card_number: string;
    card_name: string;
    card_expansion: string;
    last_updated: string;
}

export default function CardListScreen() {
    const { setId, setTitle } = useLocalSearchParams<Params>();
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const handleCardPress = (cardNumber: string) => {
        router.push({
            pathname: 'cardDetails',
            params: { cardNumber }
        });
    };

    useEffect(() => {
        fetchCards();
    }, [setId]);

    async function fetchCards() {
        try {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('card_expansion', setId)
                .order('card_number');

            if (error) {
                throw error;
            }

            if (data) {
                setCards(data);
            }
        } catch (error) {
            console.error('Error fetching cards:', error);
        } finally {
            setLoading(false);
        }
    }

    const renderCard = ({ item }: { item: Card }) => (
        <Pressable
            style={styles.card}
            onPress={() => handleCardPress(item.card_number)}
        >
            <Image
                source={{ uri: `https://images.digimoncard.io/images/cards/${item.card_number}.jpg` }}
                style={styles.cardImage}
            />
        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{setTitle}</Text>
            <FlatList
                data={cards}
                renderItem={renderCard}
                keyExtractor={item => item.card_number}
                numColumns={3}
                columnWrapperStyle={styles.row}
            />
        </View>
    );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 24) / 3;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        padding: 8,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        marginBottom: 16,
    },
    row: {
        justifyContent: 'space-between',
    },
    card: {
        width: cardWidth,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#333',
        marginBottom: 4,
    },
    cardImage: {
        width: cardWidth,
        height: cardWidth * (88/63),
        resizeMode: 'cover',
        backgroundColor: '#333',
    },
}); 