import React, { useCallback, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { AppText } from '../components/ui/AppText';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { fetchEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { spacing, radius } from '../theme';

interface Contact { id: string; name: string; phone: string; relationship?: string; is_primary: boolean }

export function EmergencyContactsScreen() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  const load = useCallback(async () => {
    try { setContacts(await fetchEmergencyContacts()); } catch { /* empty */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    await addEmergencyContact({ name, phone, relationship, isPrimary: contacts.length === 0 });
    setName(''); setPhone(''); setRelationship('');
    load();
  };

  return (
    <ScreenContainer scroll>
      <AppText variant="title">Emergency Contacts</AppText>
      <AppText variant="caption" style={{ marginBottom: spacing.lg }}>Notified during SOS alerts</AppText>
      <FlatList
        data={contacts}
        scrollEnabled={false}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText variant="body">{item.name} {item.is_primary ? '(Primary)' : ''}</AppText>
            <AppText variant="caption">{item.phone} • {item.relationship}</AppText>
            <AppButton title="Remove" variant="outline" onPress={() => deleteEmergencyContact(item.id).then(load)} />
          </View>
        )}
      />
      <AppInput label="Name" value={name} onChangeText={setName} />
      <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <AppInput label="Relationship" value={relationship} onChangeText={setRelationship} />
      <AppButton title="Add Contact" onPress={add} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
});
