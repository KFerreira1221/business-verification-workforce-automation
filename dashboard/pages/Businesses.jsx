import { useState } from "react";

function Businesses() {
    const [businesses, setBusinesses] = useState([
        {
            id:1,
            name:"Sunrise Logistics",
            status:"Active" 
        },
        {
            id:2,
            name:"Apex Manufacturing",
            status:"Pending"
        }
    ]);

    return (
        <div>
            <h1>Businesses</h1>
            <table border="1">
                
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Status</th>
                    </tr>
                </thead>
                
                <tbody>
                    
                {businessess.map((business)=>(
                    <tr key={business.id}>
                        <td>{business.name}</td>
                        <td>{business.status}</td>
                    </tr>
                ))}

                </tbody>

            </table>

        </div>
    );
}

export default Businesses;