export interface AppConfig {
  appName: string;
  companyName: string;
  companyNameUr: string;
  address: string;
  addressUr: string;
  phones: string[];
  softwareBy: string;
  softwareByUr: string;
}

export const APP_CONFIG: AppConfig = {
  appName: process.env.REACT_APP_APP_NAME || 'MY_SHOP_PPC',
  companyName: process.env.REACT_APP_COMPANY_NAME || 'MY ELECTRONICS',
  companyNameUr: process.env.REACT_APP_COMPANY_NAME_UR || 'مائی الیکٹرانکس',
  address: process.env.REACT_APP_ADDRESS || 'Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala',
  addressUr: process.env.REACT_APP_ADDRESS_UR || 'بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ',
  phones: [
    process.env.REACT_APP_PHONE_1 || '0324-9959800',
    process.env.REACT_APP_PHONE_2 || '0319-6429407',
    process.env.REACT_APP_PHONE_3 || '0318-7311277',
  ],
  softwareBy: process.env.REACT_APP_SOFTWARE_BY || 'Huzaifa (0313-6487199)',
  softwareByUr: process.env.REACT_APP_SOFTWARE_BY_UR || 'حذیفہ (0313-6487199)',
};
