interface Props {
    title: string;
    user_rol: string;
    store: string;
}
export default function TitleDash({ title, user_rol, store }: Props) { 
return (
    <div className="parent_infouser">
        <div className="title"><p className="text-xl font-semibold mb-6">{title}</p></div>
        <div className="userrol"><p>{user_rol}</p></div>
        <div className="userstore"><p>{store}</p></div>
      </div>
)};