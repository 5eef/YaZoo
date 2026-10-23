import React, { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Icon } from '../Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { dictionaries, type Locale } from '../../i18n/messages';

export function PasswordInput({ locale, style, ...props }: TextInputProps & { locale: Locale }) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  const rtl = locale === 'ar';
  const t = dictionaries[locale];
  return <View style={{ position: 'relative' }}>
    <TextInput {...props} style={[style, rtl ? { paddingLeft: 52 } : { paddingRight: 52 }]} secureTextEntry={!visible} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? t.hidePassword : t.showPassword}
      accessibilityState={{ checked: visible }} onPress={() => setVisible(current => !current)}
      style={{ position: 'absolute', top: 2, bottom: 2, ...(rtl ? { left: 2 } : { right: 2 }), width: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={visible ? 'eye-off' : 'eye'} color={colors.brandText} />
    </Pressable>
  </View>;
}
